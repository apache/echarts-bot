const Issue = require('./src/issue');
const text = require('./src/text');
const labelText = require('./src/label');
const logger = require('./src/logger');
const { isCommitter } = require('./src/coreCommitters');
const { replaceAll, removeHTMLComment, isMissingDocInfo } = require('./src/util');

module.exports = (/** @type import('probot').Probot */ app) => {
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

        // translate finally if valid
        return invalid || translateIssue(context, issue);
    });

    app.on(['issues.edited'], async context => {
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
                    // translate
                    translateIssue(context, issue);
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

    app.on(['issues.reopened'], context => {
        // unlabel invalid & missing-title when reopened by bot or commiters
        if (context.payload.issue.user.login !== context.payload.sender.login)  {
            return removeLabels(context, [
                labelText.INVALID,
                labelText.MISSING_TITLE
            ]);
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
                    closeIssue(context),
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
            if (/Duplicate (of|with) #/i.test(comment.body)) {
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
        const isCore = isCommitter(
            context.payload.pull_request.author_association,
            context.payload.pull_request.user.login
        );
        let commentText = isCore
            ? text.PR_OPENED_BY_COMMITTER
            : text.PR_OPENED;

        const labelList = [];
        const removeLabelList = [];
        const isDraft = context.payload.pull_request.draft;
        if (!isDraft) {
            labelList.push(labelText.PR_AWAITING_REVIEW);
        }
        if (isCore) {
            labelList.push(labelText.PR_AUTHOR_IS_COMMITTER);
        }

        const content = context.payload.pull_request.body || '';

        commentText = checkDoc(content, commentText, labelList, removeLabelList);

        if (content.indexOf('[x] This PR depends on ZRender changes') > -1) {
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
        const addLabel = [];
        const removeLabel = [];
        const pr = context.payload.pull_request;

        if (pr.draft) {
            removeLabel.push(labelText.PR_AWAITING_REVIEW);
        }
        else {
            addLabel.push(labelText.PR_AWAITING_REVIEW);
        }

        const content = pr.body || '';

        const commentText = checkDoc(content, '', addLabel, removeLabel);

        return Promise.all([
            commentIssue(context, commentText),
            removeLabels(removeLabel),
            addLabels(addLabel)
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
                    addLabels(context, [labelText.PR_REVISION_NEEDED]),
                    removeLabels(context, [labelText.PR_AWAITING_REVIEW])
                ]);
            }
        }
    });

    app.onError(e => {
        logger.error('bot occured an error');
        logger.error(e);
    });
}

/**
 * @param {import('probot').Context} context
 * @param {string} labelNames label names to be removed
 */
function removeLabels(context, labelNames) {
    return labelNames && Promise.all(
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
 * @param {import('probot').Context} context
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
 * @param {import('probot').Context} context
 */
function closeIssue(context) {
    // close issue
    return context.octokit.issues.update(
        context.issue({
            state: 'closed'
        })
    );
}

/**
 * @param {import('probot').Context} context
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
 * @param {import('probot').Context} context
 * @param {string} commentText
 */
function commentIssue(context, commentText) {
    // create comment
    return new Promise(resolve => {
        if (!commentText) {
            resolve();
            return;
        }
        return context.octokit.issues.createComment(
            context.issue({
                body: commentText
            })
        );
    });
}

/**
 * @param {import('probot').Context} context
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
 * @param {import('probot').Context} context
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
  return body.replace(/\! \[/g, '![').replace(/\] \(/g, '](')
}

function checkDoc(content, commentText, addLabelList, removeLabelList) {
    if (isMissingDocInfo(content)) {
        if (content.indexOf(text.PR_DOC_LATER) < 0) {
            commentText += '\n\n' + text.PR_DOC_LAGACY;
        }
        else {
            commentText += text.PR_MISSING_DOC_INFO;
        }
    }
    else {
        if (content.indexOf('[x] ' + text.PR_DOC_RREADY) >= 0) {
            addLabelList.push(labelText.PR_DOC_READY);
            removeLabelList.push(labelText.PR_DOC_UNCHANGED);
            removeLabelList.push(labelText.PR_DOC_LATER);
        }
        else if (content.indexOf('[x] ' + text.PR_DOC_UNCHANGED) >= 0) {
            addLabelList.push(labelText.PR_DOC_UNCHANGED);
            removeLabelList.push(labelText.PR_DOC_READY);
            removeLabelList.push(labelText.PR_DOC_LATER);
        }
        else if (content.indexOf('[x] ' + text.PR_DOC_LATER) >= 0) {
            addLabelList.push(labelText.PR_AWAITING_DOC);
            removeLabelList.push(labelText.PR_DOC_UNCHANGED);
            removeLabelList.push(labelText.PR_DOC_READY);
            commentText += text.PR_AWAITING_DOC;
        }
    }
    return commentText;
}
