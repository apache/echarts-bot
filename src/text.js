const NOT_USING_TEMPLATE =
    `This issue is not created using [issue template](https://github.com/apache/echarts/issues/new/choose) so I'm going to close it. 🙊
Sorry for this, but it helps save our maintainers' time so that more developers get helped.
Feel free to create another issue using the issue template.

这个 issue 未使用 [issue 模板](https://github.com/apache/echarts/issues/new/choose) 创建，所以我将关闭此 issue。
为此带来的麻烦我深表歉意，但是请理解这是为了节约社区维护者的时间，以更高效地服务社区的开发者群体。
如果您愿意，请使用 issue 模板重新创建 issue。`;

const ISSUE_CREATED =
    `Hi! We've received your issue and please be patient to get responded. 🎉
The average response time is expected to be within one day for weekdays.

In the meanwhile, please make sure that it contains **a minimum reproducible demo** and necessary **images** to illustrate. Otherwise, our committers will ask you to do so.

*A minimum reproducible demo* should contain as little data and components as possible but can still illustrate your problem. This is the best way for us to reproduce it and solve the problem faster.

You may also check out the [API](https://echarts.apache.org/api.html) and [chart option](https://echarts.apache.org/option.html) to get the answer.

If you don't get helped for a long time (over a week) or have an urgent question to ask, you may also send an email to dev@echarts.apache.org. Please attach the issue link if it's a technical question.

If you are interested in the project, you may also subscribe to our [mailing list](https://echarts.apache.org/maillist.html).

Have a nice day! 🍵`;

const INACTIVE_ISSUE =
    `This issue is closed due to not being active. Please feel free to open it again (for the author) or create a new one and reference this (for others) if you have further questions.`;

const ISSUE_UPDATED =
    `An update has been made to this issue. The maintainers are right on their way. 🚒`;

const ISSUE_TAGGED_WAITING_AUTHOR =
    `This issue is labeled with \`waiting-for: author\`.
AT_ISSUE_AUTHOR Please give more information to get the help from the community, or close this issue if you think your problem has been fixed.`;

const ISSUE_TAGGED_EASY =
    `This issue is labeled with \`difficulty: easy\`.
AT_ISSUE_AUTHOR Would you like to debug it by yourself? This is a quicker way to get your problem fixed. Or you may wait for the community to fix.

Please have a look at [How to debug ECharts](https://github.com/apache/echarts/blob/master/CONTRIBUTING.md#how-to-debug-echarts) if you'd like to give a try. 🤓`;

const MISSING_DEMO =
    `AT_ISSUE_AUTHOR Please provide a demo for the issue either with [Official Editor](https://echarts.apache.org/examples/editor.html), [CodePen](https://codepen.io/Ovilia/pen/dyYWXWM), [CodeSandbox](https://codesandbox.io/s/echarts-basic-example-template-mpfz1s) or [JSFiddle](https://jsfiddle.net/plainheart/e46ozpqj/7/).`;

const ISSUE_TAGGED_PRIORITY_HIGH =
    `This issue is labeled with \`priority: high\`, which means it's a frequently asked problem and we will fix it ASAP.`;

const PR_OPENED =
    `Thanks for your contribution!
The community will review it ASAP. In the meanwhile, please checkout [the coding standard](https://echarts.apache.org/en/coding-standard.html) and Wiki about [How to make a pull request](https://github.com/apache/echarts/wiki/How-to-make-a-pull-request).`;

const PR_OPENED_BY_COMMITTER = PR_OPENED + `

The pull request is marked to be \`PR: author is committer\` because you are a committer of this project.`;

const PR_DOC_UNCHANGED = `This PR doesn't relate to document changes`;
const PR_DOC_LATER = `The document should be updated later`;
const PR_DOC_READY = `The document changes have been made`;

const PR_DOC_LEGACY = `To reviewers: If this PR is going to be described in the changelog in the future release, please make sure this PR has one of the following labels: \`PR: doc ready\`, \`PR: awaiting doc\`, \`PR: doc unchanged\`

This message is shown because the PR description doesn't contain the document related template.`;

const PR_MISSING_DOC_INFO = `

⚠️ MISSING DOCUMENT INFO: Please make sure one of the document options are checked in this PR's description. Search "Document Info" in the description of this PR. This should be done either by the author or the reviewers of the PR.`;

const PR_AWAITING_DOC = `

Document changes are required in this PR. Please also make a PR to [apache/echarts-doc](https://github.com/apache/echarts-doc) for document changes and update the issue id in the PR description. When the doc PR is merged, the maintainers will remove the \`PR: awaiting doc\` label.`;

const PR_ZRENDER_CHANGED = '\n\nThis PR depends on [ZRender](https://github.com/ecomfe/zrender) changes. Please update the ZRender dependency to the latest nightly version including this change, which takes place everyday at 8:00 UTC (16:00 Beijing Time).\nYou can use `npm i zrender@npm:zrender-nightly@dev` to update package.json.\nIf you have any question about this, please leave a comment and we will give you extra help on this.';

const PR_MERGED =
    `Congratulations! Your PR has been merged. Thanks for your contribution! 👍`;

const PR_NOT_MERGED = `I'm sorry your PR didn't get merged. Don't get frustrated. Maybe next time. 😛`;

const LABEL_HOWTO =
    `Sorry, but please ask *how-to* questions on [Stack Overflow](https://stackoverflow.com/questions/tagged/echarts) or [segmentfault（中文）](https://segmentfault.com/t/echarts). You may also send an email about your question to dev@echarts.apache.org if you like.

Here's why:

Maintaining open source projects, especially popular ones, is [hard work](https://nolanlawson.com/2017/03/05/what-it-feels-like-to-be-an-open-source-maintainer/). As ECharts's user base has grown, we are getting more and more usage questions, bug reports, feature requests and pull requests every single day.

As a free and open source project, ECharts also has limited maintainer bandwidth. That means the only way to ensure the project's sustainability is to:

1. Prioritize more concrete work (bug fixes and new features);
2. Improve issue triaging efficiency.

For (1), we have decided to use the GitHub issue lists exclusively for work that has well-defined, actionable goals. Questions and open ended discussions should be posted to mediums that are better suited for them.

For (2), we have found that issues that do not provide proper information upfront usually results in terribly inefficient back-and-forth communication just to extract the basic information needed for actual triaging. This is exactly why we have created this app: to ensure that every issue is created with the necessary information, and to save time on both sides.`;

const ISSUE_COMMENT_TRANSLATE_TIP =
    'AT_ISSUE_AUTHOR It seems you are not using English, I\'ve helped translate the content automatically. To make your issue understood by more people and get helped, we\'d like to suggest using English next time. 🤗';

const MISSING_TITLE =
    `I'm sorry to close this issue for it lacks the necessary title. Please provide **a _descriptive_ and as _concise_ as possible title to describe your problems or requests** and then the maintainers or I will reopen this issue.

Every good bug report or feature request starts with a title. Your issue title is a critical element as it's the first thing maintainers see.

A good issue title makes it easier for maintainers to understand what the issue is, easily locate it, and know what steps they'll need to take to fix it.

Moreover, it's better to include keywords, as this makes it easier to find the issue self and similar issues in searches.`;

module.exports = {
    NOT_USING_TEMPLATE,
    ISSUE_CREATED,
    ISSUE_UPDATED,
    MISSING_DEMO,
    MISSING_TITLE,
    INACTIVE_ISSUE,
    PR_OPENED,
    LABEL_HOWTO,
    PR_MERGED,
    PR_OPENED_BY_COMMITTER,
    PR_NOT_MERGED,
    PR_DOC_UNCHANGED,
    PR_DOC_LATER,
    PR_DOC_READY,
    PR_DOC_LEGACY,
    PR_MISSING_DOC_INFO,
    PR_AWAITING_DOC,
    PR_ZRENDER_CHANGED,
    ISSUE_TAGGED_WAITING_AUTHOR,
    ISSUE_TAGGED_EASY,
    ISSUE_TAGGED_PRIORITY_HIGH,
    ISSUE_COMMENT_TRANSLATE_TIP
};
