const committers = [
    'pissang',
    '100pah',
    'Ovilia',
    'deqingli'
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
