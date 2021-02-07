const Issue = require('./src/issue');
const text = require('./src/text');
const { isCommitter } = require('./src/coreCommitters');
const logger = require('./src/logger');
const translator = require('./src/translator');
const { replaceAll, removeCodeAndComment } = require('./src/util');

module.exports = (app) => {
    app.on(['issues.opened'], async context => {
        const issue = new Issue(context);

        // Ignore comment because it will commented when adding invalid label
        const comment = issue.response === text.NOT_USING_TEMPLATE
            ? Promise.resolve()
            : commentIssue(context, issue.response, issue.response === text.ISSUE_CREATED)

        const addLabels = issue.addLabels.length
            ? context.octokit.issues.addLabels(context.issue({
                labels: issue.addLabels
            }))
            : Promise.resolve();

        const removeLabel = issue.removeLabel
            ? getRemoveLabel(issue.removeLabel)
            : Promise.resolve();

        return Promise.all([comment, addLabels, removeLabel]);
    });

    app.on('issues.labeled', async context => {
        const replaceAt = function (comment) {
            return replaceAll(
                comment,
                'AT_ISSUE_AUTHOR',
                '@' + context.payload.issue.user.login
            );
        };

        switch (context.payload.label.name) {
            case 'invalid':
                return Promise.all([commentIssue(context, text.NOT_USING_TEMPLATE), closeIssue(context)]);

            case 'howto':
                return Promise.all([commentIssue(context, text.LABEL_HOWTO), closeIssue(context)]);

            case 'inactive':
                return Promise.all([commentIssue(context, text.INACTIVE_ISSUE), closeIssue(context)]);

            case 'missing-demo':
                return Promise.all([
                    commentIssue(context, replaceAt(text.MISSING_DEMO)),
                    getRemoveLabel(context, 'waiting-for: community'),
                    context.octokit.issues.addLabels(context.issue({
                        labels: ['waiting-for: author']
                    }))
                ]);

            // case 'waiting-for: author':
            //     return commentIssue(context, replaceAt(text.ISSUE_TAGGED_WAITING_AUTHOR));

            case 'difficulty: easy':
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_EASY));

            case 'priority: high':
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_PRIORITY_HIGH));
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
            removeLabel = getRemoveLabel(context, 'waiting-for: community');
        }
        else if (isCommenterAuthor) {
            // New comment from issue author
            removeLabel = getRemoveLabel(context, 'waiting-for: author');
            addLabel = context.octokit.issues.addLabels(context.issue({
                labels: ['waiting-for: community']
            }));
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

        const labelList = ['PR: awaiting review'];
        if (isCore) {
            labelList.push('PR: author is committer');
        }
        const content = context.payload.pull_request.body;
        if (content && content.indexOf('[x] The API has been changed.') > -1) {
            labelList.push('PR: awaiting doc');
            commentText += '\n\n' + text.PR_AWAITING_DOC;
        }

        const comment = context.octokit.issues.createComment(context.issue({
            body: commentText
        }));

        const addLabel = context.octokit.issues.addLabels(context.issue({
            labels: labelList
        }));

        return Promise.all([comment, addLabel]);
    });

    app.on(['pull_request.edited'], async context => {
        const content = context.payload.pull_request.body;
        if (content && content.indexOf('[x] The API has been changed.') > -1) {
            return context.octokit.issues.addLabels(context.issue({
                labels: ['PR: awaiting doc']
            }));
        }
        else {
            return getRemoveLabel(context, 'PR: awaiting doc');
        }
    });

    app.on(['pull_request.synchronize'], async context => {
        const addLabel = context.octokit.issues.addLabels(context.issue({
            labels: ['PR: awaiting review']
        }));
        const removeLabel = getRemoveLabel(context, 'PR: revision needed');
        return Promise.all([addLabel, removeLabel]);
    });

    app.on(['pull_request.closed'], async context => {
        const actions = [
            getRemoveLabel(context, 'PR: revision needed'),
            getRemoveLabel(context, 'PR: awaiting review')
        ];
        const isMerged = context.payload['pull_request'].merged;
        if (isMerged) {
            const comment = context.octokit.issues.createComment(context.issue({
                body: text.PR_MERGED
            }));
            actions.push(comment);
        }
        return Promise.all(actions);
    });

    app.on(['pull_request_review.submitted'], async context => {
        if (context.payload.review.state === 'changes_requested'
            && isCommitter(context.payload.review.author_association, context.payload.review.user.login)
        ) {
            const addLabel = context.octokit.issues.addLabels(context.issue({
                labels: ['PR: revision needed']
            }));

            const removeLabel = getRemoveLabel(context, 'PR: awaiting review');
            return Promise.all([addLabel, removeLabel]);
        }
    });

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

function closeIssue(context) {
    const closeIssue = context.octokit.issues.update(context.issue({
        state: 'closed'
    }));
    return closeIssue;
}

async function commentIssue (context, commentText, needTranslate) {
    // create comment
    await context.octokit.issues.createComment(context.issue({
        body: commentText
    }));

    // translate the issue if needed
    if (needTranslate) {
        let { title, body } = context.payload.issue;
        title = removeCodeAndComment(title);
        body = removeCodeAndComment(body);

        const isEnTitle = translator.detectEnglish(title);
        const isEnBody = translator.detectEnglish(body);

        let translatedTitle;
        let translatedBody;

        if (!isEnTitle) {
            const res = await translator.translate(title);
            translatedTitle = res && res.translated;
        }
        if (!isEnBody) {
            const res = await translator.translate(body);
            translatedBody = res && res.translated;
        }

        if (!isEnBody && body !== translatedBody) {
            const translateTip = replaceAll(
                text.ISSUE_COMMENT_TRANSLATE_TIP,
                'AT_ISSUE_AUTHOR',
                '@' + context.payload.issue.user.login
            );
            const translateComment = `${translateTip}<details><summary>TRANSLATED</summary>${!isEnTitle && title !== translatedTitle ? '\n\n**TITLE**\n\n' + translatedTitle : ''}\n\n**BODY**\n\n${translatedBody}</details>`;
            await context.octokit.issues.createComment(
                context.issue({
                    body: translateComment
                })
            );
        }
    }
}
