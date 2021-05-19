const text = require('./text');
const label = require('./label');
const { isCommitter } = require('./coreCommitters');
const { translate } = require('./translator');
const { removeHTMLComment } = require('./util');

class Issue {
    constructor(context) {
        this.context = context;
        this.issue = context.payload.issue;
        this.title = this.issue.title;
        this.body = this.issue.body;
        // null -> failed to translate -> unknown language
        // false -> translated -> not in English
        this.translatedTitle = null;
        this.translatedBody = null;
        this.issueType = null;
        this.response = null;
        this.addLabels = [];
        this.removeLabel = null;
    }

    async init () {
        // if author is committer, do not check if using template
        const isCore = isCommitter(this.issue.author_association, this.issue.user.login);
        if (isCore || this.isUsingTemplate()) {
            if (this._contain('Steps to reproduce')) {
                this.issueType = label.BUG;
            } else if (this._contain('What problem does this feature solve')) {
                this.issueType = label.NEW_FEATURE;
            } else if (!isCore) {
                this.response = text.NOT_USING_TEMPLATE;
                return;
            }

            if (!isCore) {
                this.addLabels.push(label.PENDING);
                this.addLabels.push(label.WAITING_FOR_COMMUNITY);
            }

            this.issueType && this.addLabels.push(this.issueType);

            // translate issue
            isCore || await this._translate();

            // const isInEnglish = this._contain('This issue is in English');
            const isInEnglish = (!this.translatedTitle && !this.translatedBody)
              || (!this.title.trim() && !this.translatedBody)
              || (!this.body.trim() && !this.translatedTitle);
            if (isInEnglish) {
                this.addLabels.push(label.EN);
            }

            isCore || this._computeResponse();
        } else {
            this.response = text.NOT_USING_TEMPLATE;
            this.addLabels.push(label.INVALID);
        }
    }

    async _translate () {
        let res = await translate(this.title);
        if (res) {
            this.translatedTitle = res.lang !== 'en' && [res.translated, res.lang];
        }
        res = await translate(removeHTMLComment(this.body));
        if (res) {
            this.translatedBody = res.lang !== 'en' && [res.translated, res.lang];
        }
    }

    isUsingTemplate() {
        return this.body.indexOf('generated by echarts-issue-helper') > -1;
    }

    _computeResponse() {
        switch(this.context.payload.action) {
            case 'opened':
            case 'reopened':
                this.response = text.ISSUE_CREATED;
                break;
            case 'edited':
                this.response = text.ISSUE_UPDATED;
                this.removeLabel = label.WAITING_FOR_HELP;
                break;
        }
    }

    _contain(txt) {
        return this.body.indexOf(txt) > -1;
    }
}

module.exports = Issue;
