class Issue {
    constructor(context) {
        this.context = context;
        this.issue = context.payload.issue;
        this.body = this.issue.body;

        if (this.isUsingTemplate()) {
            this.init();
        }
        else {
            this.response = `💔 Oops... Please follow the issue template to ask questions.
                I'm going to close this issue, and please create a new issue and DO NOT DELETE ISSUE TEMPLATE.`;
        }
    }

    init() {
        this.isInEnglish = this._matches('I am using English in this issue');

        this.issueType = 'others';
        if (this._matches('I have a question to ask about')) {
            this.issueType = 'support';
        }
        else if (this._matches('I have a bug to report')) {
            this.issueType = 'bug';
        }
        else if (this._matches('I have a feature to request')) {
            this.issueType = 'new-feature';
        }
        else if (this._matches('I have a feature to enhance')) {
            this.issueType = 'enhancement';
        }
        else if (this._matches('There\'s something wrong with the documents')) {
            this.issueType = 'doc';
        }

        this.requiredReadDoc = this._matches('I have read the document');
        this.requiredSearch = this._matches('I have searched for similar issues');
        this.requiredLatest = this._matches('I have tried with the latest version');
        this.requiredIssueType = this._matches('issue type');
        this.requiredDesc = this._matches('one sentence description in issue details');
        this.requiredDemo = this._matches('demo if this is bug report')
            || this.issueType !== 'bug' && this.issueType !== 'support';
        this.requiredVersion = this._matches('ECharts version');

        this._computeResponse();
        this._computeTags();
    }

    isUsingTemplate() {
        return this.body.indexOf('I have read the document') > -1;
    }

    isMeetAllRequires() {
        return this.requiredReadDoc && this.requiredSearch && this.requiredLatest
            && this.requiredIssueType && this.requiredDesc
            && this.requiredDemo && this.requiredVersion;
    }

    _computeResponse() {
        let response = '';

        if (this.isMeetAllRequires()) {
            switch(this.context.payload.action) {
                case 'opened':
                    response = 'Hi! We\'ve received your issue and the expected respond time is within one day for weekdays. Have a nice day! 🍵';
                    break;
                case 'edited':
                    response = 'Thanks for editing. Please wait for the community to reply. 🍻'
            }
        }
        else {
            response += 'Thanks for editing, but something doesn\'t seem to be right:\n❗️ **[Error]** Please ';

            if (!this.requiredReadDoc) {
                response += 'read the [doc](https://echarts.apache.org/option.html) and [examples](https://ecomfe.github.io/echarts-examples/public/index.html)';
            }
            else if (!this.requiredSearch) {
                response += '**search issue list**';
            }
            else if (!this.requiredLatest) {
                response += 'try with the **lastest version** of ECharts';
            }
            else if (!this.requiredIssueType) {
                response += 'provide with **issue type**';
            }
            else if (!this.requiredDesc) {
                response += 'provide with **issue description**';
            }
            else if (!this.requiredDemo) {
                response += 'provide with a **demo** (place N/A for demo if your problem does not need one and check the tick of demo)';
            }
            else if (!this.requiredVersion) {
                response += 'provide with ECharts **version**';
            }

            response += ' first, and make sure everything is checked in the `REQUIRED FIELDS`.\nYou may edit this issue and I will check it again. 😃';
        }

        this.response = response;
    }

    _computeTags() {
        this.tags = [];

        if (this.isMeetAllRequires()) {
            this.tags.push('waiting-for-help');
        }
        else {
            this.tags.push('waiting-for-author');
        }

        if (this.isInEnglish) {
            this.tags.push('en');
        }

        if (this.issueType !== 'others') {
            this.tags.push(this.issueType);
        }

        const topics = this._getTopics();
        for (let i = 0; i < topics.length; ++i) {
            this.tags.push(topics[i]);
        }
    }

    _getTopics() {
        if (this.topics) {
            return this.topics;
        }
        else {
            this.topics = [];
        }

        const labels = {
            'Legend': 'legend',
            'Tooltip': 'tooltip',
            'Event': 'event',
            'Performance': 'performance',
            'SVG': 'SVG',
            'Map': 'map',
            'ECharts GL': 'gl',
            'Third-party': 'third-party'
        };
        for (let label in labels) {
            if (this._matches(label)) {
                this.topics.push(labels[label]);
            }
        }
        return this.topics;
    }

    _matches(text) {
        return this.body.indexOf('- [x] Required: ' + text) > -1;
    }
}

module.exports = Issue;
