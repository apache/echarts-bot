const NOT_USING_TEMPLATE =
    `This issue is not created using [issue template](https://ecomfe.github.io/echarts-issue-helper/) so I'm going to close it. 🙊
Sorry for this, but it helps saving our maintainers' time so that more developers get helped.
Feel free to create another issue using the issue template.

这个 issue 未使用 [issue 模板](https://ecomfe.github.io/echarts-issue-helper/?lang=zh-cn) 创建，所以我将关闭此 issue。
为此带来的麻烦我深表歉意，但是请理解这是为了节约社区维护者的时间，以更高效地服务社区的开发者群体。
如果您愿意，可以请使用 issue 模板重新创建 issue。`;

const ISSUE_CREATED =
    `Hi! We\'ve received your issue and please be patient to get responded. 🎉
The average response time is expected to be within one day for weekdays.

In the meanwhile, please make sure that **you have posted enough image to demo your request**. You may also check out the [API](http://echarts.apache.org/api.html) and [chart option](http://echarts.apache.org/option.html) to get the answer.

Have a nice day! 🍵`;

const ISSUE_UPDATED =
    `An update has been made to this issue. The maintainers are right on their way. 🚒`;

const PR_OPENED =
    `Thanks for your contribution!
@Ovilia Please check out this PR.`;

const PR_MERGED =
    `Congratulations! Your PR has been merged. Thanks for your contribution! 👍

Now you are one of the ECharts contributors. Since we joined the Apache group, you need to assign [ICLA](https://www.apache.org/licenses/icla.pdf) file if this is your first PR.
Please fill in the PDF and print it, then sign on it and send the scanned file to secretary@apache.org and oviliazhang at gmail.com with the title \`ICLA for incubator-echarts project\`.
This may be a little tricky, and sorry for the trouble. This is required for the first time your commit is merged in. If you refused, your commit will be backed off.

You may send an email to dev-subscribe@echarts.apache.org to subscribe our developing discussion on mail list.
`;

const PR_NOT_MERGED = `I'm sorry your PR didn't get merged. Don't get frustrated. Maybe next time. 😛`

const LABEL_HOWTO =
    `Sorry, but please ask *how-to* questions on [Stack Overflow](https://stackoverflow.com/questions/tagged/echarts). Here's why:

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
    PR_OPENED,
    LABEL_HOWTO,
    PR_MERGED,
    PR_NOT_MERGED
};
