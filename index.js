const Issue = require('./src/issue');

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

            const removeLabels = issue.isMeetAllRequires()
                ? context.github.issues.deleteLabel(context.issue({
                    name: 'waiting-for-author'
                }))
                : context.github.issues.deleteLabel(context.issue({
                    name: 'waiting-for-help'
                }));
            removeLabels.catch(err => {
                // Ignore error caused by not existing.
                if (err.message !== 'Not Found') {
                    throw(err);
                }
            });

            const comment = context.github.issues.createComment(context.issue({
                body: issue.response
            }));

            return Promise.all([addLabels, removeLabels, comment]);
        }
    });
}
