const Issue = require('./src/issue');
const coreCommitters = require('./src/coreCommitters');

module.exports = app => {
    app.on(['issues.opened', 'issues.edited'], async context => {
        const issue = new Issue(context);

        if (!issue.isUsingTemplate()) {
            // Close issue
            const comment = context.github.issues.createComment(context.issue({
                body: issue.response
            }));

            const close = context.github.issues.edit(context.issue({
                state: 'closed'
            }));

            return Promise.all([comment, close]);
        }
        else {
            const addLabels = issue.tags.length
                ? context.github.issues.addLabels(context.issue({
                    labels: issue.tags
                }))
                : Promise.resolve();

            const removeLabel = getRemoveLabel(
                context,
                issue.isMeetAllRequires()
                    ? 'waiting-for-author'
                    : 'waiting-for-help'
            );

            const comment = context.github.issues.createComment(context.issue({
                body: issue.response
            }));

            return Promise.all([addLabels, removeLabel, comment]);
        }
    });

    app.on('issue_comment.created', async context => {
        const commenter = context.payload.comment.user.login;
        let removeLabel, addLabel;
        if (coreCommitters.isCoreCommitter(commenter)) {
            // New comment from core committers
            removeLabel = getRemoveLabel(context, 'waiting-for-help');
            addLabel = context.github.issues.addLabels(context.issue({
                labels: ['waiting-for-author']
            }));
        }
        else if (commenter === context.payload.issue.user.login) {
            // New comment from issue author
            removeLabel = getRemoveLabel(context, 'waiting-for-author');
            addLabel = context.github.issues.addLabels(context.issue({
                labels: ['waiting-for-help']
            }));
        }
        return Promise.all([removeLabel, addLabel]);
    });
}

function getRemoveLabel(context, name) {
    return context.github.issues.deleteLabel(
        context.issue({
            name: name
        })
    ).catch(err => {
        // Ignore error caused by not existing.
        if (err.message !== 'Not Found') {
            throw(err);
        }
    });
}
