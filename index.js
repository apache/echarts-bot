const Issue = require('./src/issue');
const coreCommitters = require('./src/coreCommitters');
const text = require('./src/text');

module.exports = app => {
    app.on(['issues.opened'], async context => {
        const issue = new Issue(context);

        // Ignore comment because it will commented when adding invalid label
        const comment = issue.response === text.NOT_USING_TEMPLATE
            ? Promise.resolve()
            : commentIssue(context, issue.response);

        const addLabels = issue.addLabels.length
            ? context.github.issues.addLabels(context.issue({
                labels: issue.addLabels
            }))
            : Promise.resolve();

        const removeLabel = issue.removeLabel
            ? getRemoveLabel(issue.removeLabel)
            : Promise.resolve();

        return Promise.all([comment, addLabels, removeLabel]);
    });

    app.on('issues.labeled', async context => {
        var replaceAt = function (comment) {
            return replaceAll(
                comment,
                'AT_ISSUE_AUTHOR',
                '@' + context.payload.issue.user.login
            );
        };

        // console.log(context.payload);
        switch (context.payload.label.name) {
            case 'invalid':
                return Promise.all([commentIssue(context, text.NOT_USING_TEMPLATE), closeIssue(context)]);

            case 'howto':
                return Promise.all([commentIssue(context, text.LABEL_HOWTO), closeIssue(context)]);

            case 'inactive':
                return Promise.all([commentIssue(context, text.INACTIVE_ISSUE), closeIssue(context)]);

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
        if (coreCommitters.isCoreCommitter(commenter) && !isCommenterAuthor) {
            // New comment from core committers
            removeLabel = getRemoveLabel(context, 'waiting-for: help');
        }
        else if (isCommenterAuthor) {
            // New comment from issue author
            removeLabel = getRemoveLabel(context, 'waiting-for: author');
            addLabel = context.github.issues.addLabels(context.issue({
                labels: ['waiting-for: community']
            }));
        }
        return Promise.all([removeLabel, addLabel]);
    });

    // Pull Requests Not Tested Yet
    app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
        const auth = context.payload.pull_request.author_association;
        const comment = context.github.issues.createComment(context.issue({
            body: isCommitter(auth) ? text.PR_OPENED_BY_COMMITTER : text.PR_OPENED
        }));

        const labelList = ['PR: awaiting review'];
        if (isCommitter(auth)) {
            labelList.push('PR: author is committer');
        }
        const addLabel = context.github.issues.addLabels(context.issue({
            labels: labelList
        }));

        const removeLabel = getRemoveLabel(context, 'PR: revision needed');
        return Promise.all([comment, addLabel, removeLabel]);
    });

    app.on(['pull_request.closed'], async context => {
        const isMerged = context.payload['pull_request'].merged;
        if (isMerged) {
            const comment = context.github.issues.createComment(context.issue({
                body: text.PR_MERGED
            }));
            return Promise.all([comment]);
        }
    });

    app.on(['pull_request_review.submitted'], async context => {
        if (context.payload.review.state === 'changes_requested'
            && isCommitter(context.payload.review.author_association)
        ) {
            const addLabel = context.github.issues.addLabels(context.issue({
                labels: ['PR: revision needed']
            }));

            const removeLabel = getRemoveLabel(context, 'PR: awaiting review');
            return Promise.all([addLabel, removeLabel]);
        }
    });
}

function getRemoveLabel(context, name) {
    return context.github.issues.removeLabel(
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
    const closeIssue = context.github.issues.edit(context.issue({
        state: 'closed'
    }));
    return closeIssue;
}

function commentIssue(context, commentText) {
    const comment = context.github.issues.createComment(context.issue({
        body: commentText
    }));
    return comment;
}

function replaceAll(str, search, replacement) {
    return str.replace(new RegExp(search, 'g'), replacement);
}

function isCommitter(auth) {
    return auth === 'COLLABORATOR' || auth === 'MEMBER' || auth === 'OWNER' || auth === 'CONTRIBUTOR';
}
