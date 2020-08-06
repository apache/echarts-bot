const committers = [
    'pissang',
    '100pah',
    'Ovilia',
    'deqingli',
    'Wdingding',
    'susiwen8',
    'cuijian-dexter',
    'SnailSword',
    'plainheart',
    'wf123537200',
    'yufeng04',
    'chfw',
    'alex2wong',
    'ClemMakesApps'
];

function getCoreCommitters() {
    return committers;
}

function isCoreCommitter(user) {
    return committers.indexOf(user) > -1;
}

module.exports = {
    getCoreCommitters,
    isCoreCommitter
};
