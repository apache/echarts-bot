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
    'ClemMakesApps',
    'fuchunhui',
    'lefex',
    'jiawulin001'
];

function getCoreCommitters() {
    return committers;
}

function isCoreCommitter(user) {
    return committers.indexOf(user) > -1;
}

function isCommitter(auth, user) {
    return auth === 'COLLABORATOR' || auth === 'MEMBER' || auth === 'OWNER' || isCoreCommitter(user);
}

module.exports = {
    getCoreCommitters,
    isCoreCommitter,
    isCommitter
};
