const Issue = require('./src/issue');
const text = require('./src/text');
const labelText = require('./src/label');
const { isCommitter } = require('./src/coreCommitters');
const logger = require('./src/logger');
const { replaceAll, removeHTMLComment } = require('./src/util');

module.exports = (/** @type import('probot').Probot */ app) => {
    app.on(['issues.opened'], async context => {
        const issue = new Issue(context);

        await issue.init();

        // issue.response && await commentIssue(context, issue.response);

        const addLabels = issue.addLabels.length
            && context.octokit.issues.addLabels(
                context.issue({
                    labels: issue.addLabels
                })
            );

        const removeLabel = issue.removeLabel && getRemoveLabel(context, issue.removeLabel);

        // add and remove label
        await Promise.all([addLabels, removeLabel]);

        const invalid = addLabels.includes(labelText.INVALID);

        // translate finally if valid
        return invalid || translateIssue(context, issue);
    });

    app.on(['issues.closed'], context => {
        // unlabel waiting-for: community if issue was closed by the author self
        if (context.payload.issue.user.login === context.payload.sender.login) {
            return getRemoveLabel(context, labelText.WAITING_FOR_COMMUNITY);
        }
    });

    app.on(['issues.reopened'], context => {
        // unlabel invalid when reopened
        return getRemoveLabel(context, labelText.INVALID);
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
                return Promise.all([commentIssue(context, text.NOT_USING_TEMPLATE), closeIssue(context)]);

            case labelText.HOWTO:
                return Promise.all([commentIssue(context, text.LABEL_HOWTO), closeIssue(context)]);

            case labelText.INACTIVE:
                return Promise.all([commentIssue(context, text.INACTIVE_ISSUE), closeIssue(context)]);

            case labelText.MISSING_DEMO:
                return Promise.all([
                    commentIssue(context, replaceAt(text.MISSING_DEMO)),
                    getRemoveLabel(context, labelText.WAITING_FOR_COMMUNITY),
                    context.octokit.issues.addLabels(context.issue({
                        labels: [labelText.WAITING_FOR_AUTHOR]
                    }))
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
                    getRemoveLabel(context, labelText.WAITING_FOR_COMMUNITY)
                ]);
        }
    });

    app.on('issue_comment.created', async context => {
        const isPr = context.payload.issue.html_url.indexOf('/pull/') > -1;
        if (isPr) {
            // Do nothing when pr is commented
            return;
        }

        const commenter = context.payload.comment.user.login;
        const isCommenterAuthor = commenter === context.payload.issue.user.login;
        let removeLabel;
        let addLabel;
        if (isCommitter(context.payload.comment.author_association, commenter) && !isCommenterAuthor) {
            // New comment from core committers
            removeLabel = getRemoveLabel(context, labelText.WAITING_FOR_COMMUNITY);
        }
        else if (isCommenterAuthor) {
            // New comment from issue author
            removeLabel = getRemoveLabel(context, labelText.WAITING_FOR_AUTHOR);
            addLabel = context.octokit.issues.addLabels(
                context.issue({
                    labels: [labelText.WAITING_FOR_COMMUNITY]
                })
            );
        }
        return Promise.all([removeLabel, addLabel]);
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
        const isDraft = context.payload.pull_request.draft;
        if (!isDraft) {
            labelList.push(labelText.PR_AWAITING_REVIEW);
        }
        if (isCore) {
            labelList.push(labelText.PR_AUTHOR_IS_COMMITTER);
        }

        const content = context.payload.pull_request.body;
        if (content && content.indexOf('[x] The API has been changed') > -1) {
            labelList.push(labelText.PR_AWAITING_DOC);
            commentText += '\n\n' + text.PR_AWAITING_DOC;
        }
        if (content && content.indexOf('[x] This PR depends on ZRender changes') > -1) {
            commentText += '\n\n' + text.PR_ZRENDER_CHANGED;
        }

        if (await isFirstTimeContributor(context)) {
            labelList.push(labelText.PR_FIRST_TIME_CONTRIBUTOR);
        }

        const comment = context.octokit.issues.createComment(
            context.issue({
                body: commentText
            })
        );

        const addLabel = context.octokit.issues.addLabels(
            context.issue({
                labels: labelList
            })
        );

        return Promise.all([comment, addLabel]);
    });

    app.on(['pull_request.ready_for_review'], async context => {
        return context.octokit.issues.addLabels(
            context.issue({
                labels: [labelText.PR_AWAITING_REVIEW]
            })
        );
    });

    app.on(['pull_request.converted_to_draft'], async context => {
        return getRemoveLabel(context, labelText.PR_AWAITING_REVIEW);
    });

    app.on(['pull_request.edited'], async context => {
        const addLabels = [];
        const removeLabels = [];

        const isDraft = context.payload.pull_request.draft;
        if (isDraft) {
            removeLabels.push(getRemoveLabel(context, labelText.PR_AWAITING_REVIEW));
        } else {
            addLabels.push(labelText.PR_AWAITING_REVIEW);
        }

        const content = context.payload.pull_request.body;
        if (content && content.indexOf('[x] The API has been changed') > -1) {
            addLabels.push(labelText.PR_AWAITING_DOC);
        }
        else {
            removeLabels.push(getRemoveLabel(context, labelText.PR_AWAITING_DOC));
        }

        const addLabel = context.octokit.issues.addLabels(
          context.issue({
            labels: addLabels
          })
        );

        return Promise.all(removeLabels.concat([addLabel]));
    });

    app.on(['pull_request.synchronize'], async context => {
        const removeLabel = getRemoveLabel(context, labelText.PR_REVISION_NEEDED);
        const addLabel = context.payload.pull_request.draft
            ? Promise.resolve()
            : context.octokit.issues.addLabels(
                context.issue({
                    labels: [labelText.PR_AWAITING_REVIEW]
                })
              );
        return Promise.all([removeLabel, addLabel]);
    });

    app.on(['pull_request.closed'], async context => {
        const actions = [
            getRemoveLabel(context, labelText.PR_REVISION_NEEDED),
            getRemoveLabel(context, labelText.PR_AWAITING_REVIEW)
        ];
        const isMerged = context.payload.pull_request.merged;
        if (isMerged) {
            const comment = context.octokit.issues.createComment(
                context.issue({
                    body: text.PR_MERGED
                })
            );
            actions.push(comment);
        }
        return Promise.all(actions);
    });

    app.on(['pull_request_review.submitted'], async context => {
        if (context.payload.review.state === 'changes_requested'
            && isCommitter(context.payload.review.author_association, context.payload.review.user.login)
        ) {
            const addLabel = context.octokit.issues.addLabels(
                context.issue({
                    labels: [labelText.PR_REVISION_NEEDED]
                })
            );

            const removeLabel = getRemoveLabel(context, labelText.PR_AWAITING_REVIEW);
            return Promise.all([addLabel, removeLabel]);
        }
    });

    // it can be app.onError since v11.1.0
    app.webhooks.onError(error => {
        logger.error('bot occured an error');
        logger.error(error);
    });
}

function getRemoveLabel(context, name) {
    return context.octokit.issues.removeLabel(
        context.issue({
            name: name
        })
    ).catch(err => {
        // Ignore error caused by not existing.
        // if (err.message !== 'Not Found') {
        //     throw(err);
        // }
    });
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
 * @param {string} commentText
 */
function commentIssue(context, commentText) {
    // create comment
    return context.octokit.issues.createComment(
        context.issue({
            body: commentText
        })
    );
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
        await context.octokit.issues.createComment(
            context.issue({
                body: translateComment
            })
        );
    }
}

/**
 * @param {string} body
 */
function fixMarkdown(body) {
  return body.replace(/\! \[/g, '![').replace(/\] \(/g, '](')
}
