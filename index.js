const Issue = require('./src/issue');
const text = require('./src/text');
const labelText = require('./src/label');
const logger = require('./src/logger');
const { isCommitter } = require('./src/coreCommitters');
const {
    replaceAll,
    removeHTMLComment,
    isMissingDocInfo,
    isOptionChecked
} = require('./src/util');
const { GraphqlResponseError } = require('@octokit/graphql');

/**
 * @typedef {import('probot').Probot} Probot
 * @typedef {import('probot').Context} Context
 * @typedef {import('@octokit/graphql-schema').ReportedContentClassifiers} ReportedContentClassifiers
 * @typedef {import('@octokit/graphql-schema').IssueClosedStateReason} IssueClosedStateReason
 */

module.exports = (/** @type {Probot} */ app) => {
    app.on(['issues.opened'], async context => {
        const issue = new Issue(context);

        await issue.init();

        // issue.response && await commentIssue(context, issue.response);

        // add and remove label
        await Promise.all([
            addLabels(context, issue.addLabels),
            removeLabels(context, issue.removeLabels)
        ]);

        const invalid = issue.addLabels.includes(labelText.INVALID)
            || issue.addLabels.includes(labelText.MISSING_TITLE);

        if (!invalid) {
            // update title
            issue.isTitleChanged && await updateIssueTitle(context, issue.title);
            // translate finally if valid
            await translateIssue(context, issue);
        }
    });

    app.on(['issues.edited'], async context => {
        if (context.payload.sender.type === 'Bot') {
            logger.info('skip to handle current `issues.edited` event as it is from bot');
            return;
        }
        const ctxIssue = context.payload.issue;
        const labels = ctxIssue.labels;
        if (labels && labels.findIndex(label => label.name === labelText.MISSING_TITLE) > -1) {
            // issue was closed for missing-title
            if (ctxIssue.state === 'closed') {
                const issue = new Issue(context);
                await issue.init();
                const invalid = issue.addLabels.includes(labelText.INVALID)
                    || issue.addLabels.includes(labelText.MISSING_TITLE);
                // issue title has been provided and uses the template, reopen it
                if (!invalid) {
                    // add labels
                    await addLabels(context, issue.addLabels);
                    // reopen issue
                    await openIssue(context);
                    // update title
                    issue.isTitleChanged && await updateIssueTitle(context, issue.title);
                    // translate
                    await translateIssue(context, issue);
                }
            }
        }
    });

    app.on(['issues.closed'], context => {
        // unlabel waiting-for: community if issue was closed by the author self
        if (context.payload.issue.user.login === context.payload.sender.login) {
            return removeLabels(context, [labelText.WAITING_FOR_COMMUNITY]);
        }
    });

    app.on(['issues.reopened'], async context => {
        // unlabel invalid & missing-title when reopened by bot or committers
        if (context.payload.issue.user.login !== context.payload.sender.login) {
            await removeLabels(context, [
                labelText.INVALID,
                labelText.MISSING_TITLE
            ]);
            minimizeComment(context, text.MISSING_TITLE);
            minimizeComment(context, text.NOT_USING_TEMPLATE);
        }
    });

    app.on('issues.labeled', async context => {
        const labelName = context.payload.label.name;
        const issue = context.payload.issue;
        const issueAuthor = issue.user.login;
        if (labelName !== labelText.RESOLVED && isCommitter(issue.author_association, issueAuthor)) {
            //  do nothing if issue author is committer
            return;
        }

        const replaceAt = function (comment) {
            return replaceAll(
                comment,
                'AT_ISSUE_AUTHOR',
                '@' + issueAuthor
            );
        };

        switch (labelName) {
            case labelText.INVALID:
                return Promise.all([
                    commentIssue(context, text.NOT_USING_TEMPLATE),
                    closeIssue(context)
                ]);

            case labelText.HOWTO:
                return Promise.all([
                    commentIssue(context, text.LABEL_HOWTO),
                    closeIssue(context)
                ]);

            case labelText.INACTIVE:
                return Promise.all([
                    commentIssue(context, text.INACTIVE_ISSUE),
                    closeIssue(context)
                ]);

            case labelText.MISSING_DEMO:
                return Promise.all([
                    commentIssue(context, replaceAt(text.MISSING_DEMO)),
                    removeLabels(context, [labelText.WAITING_FOR_COMMUNITY]),
                    addLabels(context, [labelText.WAITING_FOR_AUTHOR])
                ]);

            // case labelText.WAITING_FOR_AUTHOR:
            //     return commentIssue(context, replaceAt(text.ISSUE_TAGGED_WAITING_AUTHOR));

            case labelText.DIFFICULTY_EASY:
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_EASY));

            case labelText.PRIORITY_HIGH:
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_PRIORITY_HIGH));

            case labelText.RESOLVED:
            case labelText.DUPLICATE:
                return Promise.all([
                    closeIssue(context, labelName === labelText.RESOLVED),
                    removeLabels(context, [labelText.WAITING_FOR_COMMUNITY])
                ]);

            case labelText.MISSING_TITLE:
                return Promise.all([
                    commentIssue(context, text.MISSING_TITLE),
                    closeIssue(context)
                ]);
        }
    });

    app.on('issue_comment.created', async context => {
        const isPr = context.payload.issue.html_url.indexOf('/pull/') > -1;
        if (isPr) {
            // Do nothing when pr is commented
            return;
        }

        const comment = context.payload.comment;
        const commenter = comment.user.login;
        const isCommenterAuthor = commenter === context.payload.issue.user.login;
        const isCore = isCommitter(comment.author_association, commenter);
        let removeLabel;
        let addLabel;
        if (isCore && !isCommenterAuthor) {
            // add `duplicate` label when a committer comments with the `Duplicate of/with` keyword on the issue
            if (/Duplicated? (of|with) #/i.test(comment.body)) {
                addLabel = labelText.DUPLICATE;
            }
            else {
                // New comment from core committers
                removeLabel = labelText.WAITING_FOR_COMMUNITY;
            }
        }
        else if (isCommenterAuthor) {
            // New comment from issue author
            removeLabel = labelText.WAITING_FOR_AUTHOR;
            // addLabel = labelText.WAITING_FOR_COMMUNITY;
        }
        return Promise.all([
            removeLabels(context, [removeLabel]),
            addLabel && addLabels(context, [addLabel])
        ]);
    });

    app.on(['pull_request.opened'], async context => {
        const pr = context.payload.pull_request;
        const isCore = isCommitter(pr.author_association, pr.user.login);
        let commentText = isCore
            ? text.PR_OPENED_BY_COMMITTER
            : text.PR_OPENED;

        const labelList = [];
        const removeLabelList = [];
        const isDraft = pr.draft;
        if (!isDraft) {
            labelList.push(labelText.PR_AWAITING_REVIEW);
        }
        if (isCore) {
            labelList.push(labelText.PR_AUTHOR_IS_COMMITTER);
        }

        const content = pr.body || '';

        commentText = checkDoc(content, commentText, labelList, removeLabelList);

        if (content.toLowerCase().includes('[x] This PR depends on ZRender changes'.toLowerCase())) {
            commentText += text.PR_ZRENDER_CHANGED;
        }

        if (await isFirstTimeContributor(context)) {
            labelList.push(labelText.PR_FIRST_TIME_CONTRIBUTOR);
        }

        return Promise.all([
            commentIssue(context, commentText),
            addLabels(context, labelList),
            removeLabels(context, removeLabelList)
        ]);
    });

    app.on(['pull_request.ready_for_review'], async context => {
        return addLabels(context, [labelText.PR_AWAITING_REVIEW]);
    });

    app.on(['pull_request.converted_to_draft'], async context => {
        return removeLabels(context, [labelText.PR_AWAITING_REVIEW]);
    });

    app.on(['pull_request.edited'], async context => {
        const pr = context.payload.pull_request;
        const isOpen = pr.state === 'open';

        const addLabel = [];
        const removeLabel = [];

        if (pr.draft) {
            removeLabel.push(labelText.PR_AWAITING_REVIEW);
        }
        else if (isOpen) {
            addLabel.push(labelText.PR_AWAITING_REVIEW);
        }

        const content = pr.body || '';

        const commentText = checkDoc(content, '', addLabel, removeLabel);

        return Promise.all([
            commentIssue(context, commentText),
            removeLabels(context, removeLabel),
            addLabels(context, addLabel)
        ]);
    });

    app.on(['pull_request.synchronize'], async context => {
        const removeLabel = removeLabels(context, [labelText.PR_REVISION_NEEDED]);
        const addLabel = context.payload.pull_request.draft
            || addLabels(context, [labelText.PR_AWAITING_REVIEW]);
        return Promise.all([removeLabel, addLabel]);
    });

    app.on(['pull_request.closed'], async context => {
        const actions = [
            removeLabels(context, [
                labelText.PR_REVISION_NEEDED,
                labelText.PR_AWAITING_REVIEW
            ])
        ];
        const isMerged = context.payload.pull_request.merged;
        if (isMerged) {
            actions.push(commentIssue(context, text.PR_MERGED));
        }
        return Promise.all(actions);
    });

    app.on(['pull_request_review.submitted'], async context => {
        const review = context.payload.review;
        const addLabel = [];
        const removeLabel = [];
        if (isCommitter(review.author_association, review.user.login)) {
            if (review.state === 'changes_requested') {
                return Promise.all([
                    addLabels(context, [labelText.PR_REVISION_NEEDED]),
                    removeLabels(context, [labelText.PR_AWAITING_REVIEW])
                ]);
            }
            else if (review.state === 'approved') {
                const pr = context.payload.pull_request;
                const content = pr.body || '';
                const commentText = checkDoc(content, '', addLabel, removeLabel);
                return Promise.all([
                    commentIssue(context, commentText),
                    removeLabels(context, [
                        labelText.PR_AWAITING_REVIEW,
                        labelText.PR_REVISION_NEEDED
                    ])
                ]);
            }
        }
    });

    app.onError(e => {
        logger.error('bot occurred an error');
        logger.error(e);
    });
}

/**
 * @param {Context} context
 * @param {string} labelNames label names to be removed
 */
function removeLabels(context, labelNames) {
    return labelNames && labelNames.length && Promise.all(
        labelNames.map(
            label => context.octokit.issues.removeLabel(
                context.issue({
                    name: label
                })
            ).catch(err => {
                // Ignore error caused by not existing.
                // if (err.message !== 'Not Found') {
                //     throw(err);
                // }
            })
        )
    );
}

/**
 * @param {Context} context
 * @param {Array<string>} labelNames label names to be added
 */
function addLabels(context, labelNames) {
    return labelNames && labelNames.length && context.octokit.issues.addLabels(
        context.issue({
            labels: labelNames
        })
    )
}

/**
 * @param {Context} context
 * @param {boolean?} completed
 */
async function closeIssue(context, completed) {
    // close issue
    return await context.octokit.issues.update(
        context.issue({
            state: 'closed',
            // PENDING: not list in the documentation
            state_reason: completed ? 'completed' : 'not_planned'
        })
    );
    // use GraphQL to close the issue with specified reason
    // const res = await context.octokit.graphql(
    //     `
    //         mutation closeIssue($id: ID!, $reason: IssueClosedStateReason) {
    //             closeIssue(input: { issueId: $id, stateReason: $reason }) {
    //                 clientMutationId
    //                 issue {
    //                     number
    //                     closed
    //                     state
    //                     stateReason
    //                 }
    //             }
    //         }
    //     `,
    //     {
    //         id: context.payload.issue.node_id,
    //         /**
    //          * @type {IssueClosedStateReason}
    //          */
    //         reason: completed ? 'COMPLETED' : 'NOT_PLANNED'
    //     }
    // );
    // logger.info('close issue result: \n' + JSON.stringify(res, null, 2));
    // return res;
}

/**
 * @param {Context} context
 */
function openIssue(context) {
    // open issue
    return context.octokit.issues.update(
        context.issue({
            state: 'open'
        })
    );
}

/**
 * @param {Context} context
 * @param {string} title
 */
function updateIssueTitle(context, title) {
    return context.octokit.issues.update(
        context.issue({
            title
        })
    );
}

/**
 * @param {Context} context
 * @param {string} commentText
 */
async function commentIssue(context, commentText) {
    commentText = commentText && commentText.trim();
    if (!commentText) {
        return;
    }
    try {
        if (await hasCommented(context, commentText)) {
            logger.info('skip current comment as it has been submitted');
            return;
        }
        return await context.octokit.issues.createComment(
            context.issue({
                body: commentText
            })
        );
    } catch (e) {
        logger.error('failed to comment')
        logger.error(e);
    }
}

/**
 * @param {Context} context
 */
async function isFirstTimeContributor(context) {
    try {
        const response = await context.octokit.issues.listForRepo(
            context.repo({
                state: 'all',
                creator: context.payload.pull_request.user.login
            })
        );
        return response.data.filter(data => data.pull_request).length === 1;
    }
    catch (e) {
        logger.error('failed to check first-time contributor');
        logger.error(e);
    }
}

/**
 * @param {Context} context
 * @param {Issue} createdIssue
 */
async function translateIssue(context, createdIssue) {
    if (!createdIssue) {
        return;
    }

    const {
        title, body,
        translatedTitle, translatedBody
    } = createdIssue;

    const titleNeedsTranslation = translatedTitle && translatedTitle[0] !== title;
    const bodyNeedsTranslation = translatedBody && translatedBody[0] !== removeHTMLComment(body);
    const needsTranslation = titleNeedsTranslation || bodyNeedsTranslation;

    logger.info('issue needs translation: ' + needsTranslation);

    // translate the issue if needed
    if (needsTranslation) {
        const translateTip = replaceAll(
            text.ISSUE_COMMENT_TRANSLATE_TIP,
            'AT_ISSUE_AUTHOR',
            '@' + createdIssue.issue.user.login
        );
        const translateComment = `${translateTip}\n<details><summary><b>TRANSLATED</b></summary><br>${titleNeedsTranslation ? '\n\n**TITLE**\n\n' + translatedTitle[0] : ''}${bodyNeedsTranslation ? '\n\n**BODY**\n\n' + fixMarkdown(translatedBody[0]) : ''}\n</details>`;
        await commentIssue(context, translateComment);
    }
}

/**
 * @param {string} body
 */
function fixMarkdown(body) {
    return body.replace(/\! \[/g, '![').replace(/\] \(/g, '](');
}

/**
 * @param {string} content
 * @param {string} commentText
 * @param {Array.<string>} addLabelList
 * @param {Array.<string>} removeLabelList
 */
function checkDoc(content, commentText, addLabelList, removeLabelList) {
    if (isMissingDocInfo(content)) {
        if (!content.includes(text.PR_DOC_LATER)) {
            commentText += '\n\n' + text.PR_DOC_LEGACY;
        }
        else {
            commentText += text.PR_MISSING_DOC_INFO;
        }
    }
    else {
        if (isOptionChecked(content, text.PR_DOC_READY)) {
            addLabelList.push(labelText.PR_DOC_READY);
            removeLabelList.push(
                labelText.PR_DOC_UNCHANGED,
                labelText.PR_AWAITING_DOC
            );
        }
        else if (isOptionChecked(content, text.PR_DOC_UNCHANGED)) {
            addLabelList.push(labelText.PR_DOC_UNCHANGED);
            removeLabelList.push(
                labelText.PR_DOC_READY,
                labelText.PR_AWAITING_DOC
            );
        }
        else if (isOptionChecked(content, text.PR_DOC_LATER)) {
            addLabelList.push(labelText.PR_AWAITING_DOC);
            removeLabelList.push(
                labelText.PR_DOC_UNCHANGED,
                labelText.PR_DOC_READY
            );
            commentText += text.PR_AWAITING_DOC;
        }
    }
    return commentText;
}

/**
 * Check if a comment has submitted
 * @param {Context} context
 * @param {string} commentText
 */
async function hasCommented(context, commentText) {
    const comments = (await context.octokit.issues.listComments(context.issue())).data;
    return comments.findIndex(comment =>
        comment.user.type === 'Bot'
        && comment.body
        && comment.body.replace(/\r\n/g, '\n').includes(commentText)
    ) > -1;
}

/**
 * Minimize a comment with specified classifier
 *
 * FIXME: unlike hiding via the UI, it doesn't show the classifier in the information
 *
 * @param {Context} context
 * @param {string} commentText
 * @param {ReportedContentClassifiers?} classifier
 */
async function minimizeComment(context, commentText, classifier) {
    const comments = (await context.octokit.issues.listComments(context.issue())).data;
    const comment = comments.find(comment => comment.user.type === 'Bot' && comment.body === commentText);
    if (!comment) {
        return;
    }
    try {
        const res = await context.octokit.graphql(
            `
                mutation minimizeComment($id: ID!, $classifier: ReportedContentClassifiers!) {
                    minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
                        clientMutationId
                        minimizedComment {
                            isMinimized
                            minimizedReason
                            viewerCanMinimize
                        }
                    }
                }
            `,
            {
                id: comment.node_id,
                classifier: classifier || 'OUTDATED'
            }
        );
        logger.info('minimize comment result: \n' + JSON.stringify(res, null, 2));
    } catch (e) {
        if (e instanceof GraphqlResponseError) {
            logger.error('GraphQL Request Failed');
            logger.error(JSON.stringify(e.request, null, 2));
        }
        logger.error(e);
    }
}
