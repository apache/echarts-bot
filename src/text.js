const NOT_USING_TEMPLATE =
    `This issue is not created using [issue template](https://ecomfe.github.io/echarts-issue-helper/) so I'm going to close it. 🙊
Sorry for this, but it helps save our maintainers' time so that more developers get helped.
Feel free to create another issue using the issue template.

If you think you have already made your point clear without the template, or your problem cannot be covered by it, you may re-open this issue again.

这个 issue 未使用 [issue 模板](https://ecomfe.github.io/echarts-issue-helper/?lang=zh-cn) 创建，所以我将关闭此 issue。
为此带来的麻烦我深表歉意，但是请理解这是为了节约社区维护者的时间，以更高效地服务社区的开发者群体。
如果您愿意，请使用 issue 模板重新创建 issue。

如果您认为虽然没有使用模板，但您已经提供了复现问题的充分描述，或者您的问题无法使用模板表达，也可以重新 open 这个 issue。`;

const ISSUE_CREATED =
    `Hi! We've received your issue and please be patient to get responded. 🎉
The average response time is expected to be within one day for weekdays.

In the meanwhile, please make sure that **you have posted enough image to demo your request**. You may also check out the [API](http://echarts.apache.org/api.html) and [chart option](http://echarts.apache.org/option.html) to get the answer.

If you don't get helped for a long time (over a week) or have an urgent question to ask, you may also send an email to dev@echarts.apache.org. Please attach the issue link if it's a technical question.

If you are interested in the project, you may also subscribe our [mailing list](https://echarts.apache.org/en/maillist.html).

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

Please have a look at [How to debug ECharts](https://github.com/apache/incubator-echarts/blob/master/CONTRIBUTING.md#how-to-debug-echarts) if you'd like to give a try. 🤓`;

const MISSING_DEMO =
    `AT_ISSUE_AUTHOR Please provide a demo for the issue either with https://codepen.io/Ovilia/pen/dyYWXWM or https://gallery.echartsjs.com/editor.html.`;

const ISSUE_TAGGED_PRIORITY_HIGH =
    `This issue is labeled with \`priority: high\`, which means it's a frequently asked problem and we will fix it ASAP.`;


const PR_OPENED =
    `Thanks for your contribution!
The community will review it ASAP. In the meanwhile, please checkout [the coding standard](https://echarts.apache.org/en/coding-standard.html) and Wiki about [How to make a pull request](https://github.com/apache/incubator-echarts/wiki/How-to-make-a-pull-request).`;

const PR_OPENED_BY_COMMITTER = PR_OPENED + `

The pull request is marked to be \`PR: author is committer\` because you are a committer of this project.`;

const PR_AWAITING_DOC = `Document changes are required in this PR. Please also make a PR to [apache/incubator-echarts-doc](https://github.com/apache/incubator-echarts-doc) for document changes. When the doc PR is merged, the maintainers will remove the \`PR: awaiting doc\` label.
`;

const PR_MERGED =
    `Congratulations! Your PR has been merged. Thanks for your contribution! 👍`;

const PR_NOT_MERGED = `I'm sorry your PR didn't get merged. Don't get frustrated. Maybe next time. 😛`

const LABEL_HOWTO =
    `Sorry, but please ask *how-to* questions on [Stack Overflow](https://stackoverflow.com/questions/tagged/echarts) or [segmentfault（中文）](https://segmentfault.com/t/echarts). You may also send an email about your question to dev@echarts.apache.org if you like.

Here's why:

Maintaining open source projects, especially popular ones, is [hard work](https://nolanlawson.com/2017/03/05/what-it-feels-like-to-be-an-open-source-maintainer/). As ECharts's user base has grown, we are getting more and more usage questions, bug reports, feature requests and pull requests every single day.

As a free and open source project, ECharts also has limited maintainer bandwidth. That means the only way to ensure the project's sustainability is to:

1. Prioritize more concrete work (bug fixes and new features);
2. Improve issue triaging efficiency.

For (1), we have decided to use the GitHub issue lists exclusively for work that has well-defined, actionable goals. Questions and open ended discussions should be posted to mediums that are better suited for them.

For (2), we have found that issues that do not provide proper information upfront usually results in terribly inefficient back-and-forth communication just to extract the basic information needed for actual triaging. This is exactly why we have created this app: to ensure that every issue is created with the necessary information, and to save time on both sides.`

module.exports = {
    NOT_USING_TEMPLATE,
    ISSUE_CREATED,
    ISSUE_UPDATED,
    MISSING_DEMO,
    INACTIVE_ISSUE,
    PR_OPENED,
    LABEL_HOWTO,
    PR_MERGED,
    PR_OPENED_BY_COMMITTER,
    PR_NOT_MERGED,
    PR_AWAITING_DOC,
    ISSUE_TAGGED_WAITING_AUTHOR,
    ISSUE_TAGGED_EASY,
    ISSUE_TAGGED_PRIORITY_HIGH
};
