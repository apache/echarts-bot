const committers = [
    'pissang',
    '100pah',
    'Ovilia',
    'deqingli',
    'susiwen8',
    'cuijian-dexter',
    'SnailSword'
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
