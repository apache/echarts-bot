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

            case 'waiting-for: author':
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_WAITING_AUTHOR));

            case 'difficulty: easy':
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_EASY));

            case 'priority: high':
                return commentIssue(context, replaceAt(text.ISSUE_TAGGED_PRIORITY_HIGH));
        }
    });

    app.on('issue_comment.created', async context => {
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
    // app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    //     console.log('pull request open');
    //     const comment = context.github.issues.createComment(context.issue({
    //         body: text.PR_OPENED
    //     }));

    //     return Promise.all([comment]);
    // });

    // app.on(['pull_request.closed'], async context => {
    //     console.log('pull request close');
    //     console.log(context.payload);
    //     const isMerged = context.payload['pull_request'].merged;
    //     const comment = context.github.issues.createComment(context.issue({
    //         body: isMerged ? text.PR_MERGED : text.PR_NOT_MERGED
    //     }));

    //     return Promise.all([comment]);
    // });
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
