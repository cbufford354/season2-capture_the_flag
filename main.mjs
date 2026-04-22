import { getObjectsByPrototype } from 'game/utils';
import { Flag, Creep } from 'game/prototypes';
import { ERR_NOT_IN_RANGE } from 'game/constants';
import { getTicks, getRange } from 'arena/season_beta/capture_the_flag/basic';
import { ATTACK, getObjectById, HEAL, RANGED_ATTACK } from 'game';

export function loop() {

    let oppsFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    let myFlag = getObjectsByPrototype(Flag).find(object => object.my)
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    let opps = getObjectsByPrototype(Creep).filter(object => !object.my)

    // find enemies threatening the flag
    let lurkingOpps = opps.filter(opp => getRange(opp, myFlag) < 12);
    // find week opps
    let weekOpps = lurkingOpps.sort((a, b) => a.hits - b.hits);
    // find week allies
    let weakAllies = myCreeps.sort((a, b) => a.hits - b.hits);
    // find close opps
    let closeOpps = lurkingOpps.sort((a, b) => getRange(a, myFlag) - getRange(b, myFlag));

    // how many creeps do i have
    if (getTicks() % 10 === 0) {
        console.log(`${myCreeps.length > 1 ? "I am the one who knocks" : "LAST CREEP STANDING, stop knocking"} `);
    }

    // designate each creep by type a role
    for (let creep of myCreeps) {
        if (creep.body.some(creep => creep.type === ATTACK)) {
            grappler(creep);
        }
        if (creep.body.some(creep => creep.type === RANGED_ATTACK)) {
            sniper(creep);
        }
        if (creep.body.some(creep => creep.type === HEAL)) {
            doctor(creep)
        }
    }

    function grappler(creep) {
        // gang up on weakest opp near the flag
        if (weekOpps.length > 0) {
            creep.moveTo(weekOpps[0]);
            creep.attack(weekOpps[0]);
        } else {
            // no threats nearby, stay close to the flag as a guard
            if (getRange(creep, myFlag) > 4) {
                creep.moveTo(myFlag);  // return to guard position if drifted too far
            }
            // if already close to flag, wait and mentally prepare!!
        }
    }

    function sniper(creep) {
        if (weekOpps.length === 0) return;
        if (creep.rangedAttack(weekOpps[0]) === ERR_NOT_IN_RANGE) {
            creep.moveTo(weekOpps[0]);
        }
    }
    function doctor(creep) {
        // lets make sure a weak ally is actually hurt #dontWasteEnergy
        let damagedAllies = weakAllies.filter(ally => ally.hits < ally.hitsMax);
        if (damagedAllies.length === 0) return;

        if (creep.heal(damagedAllies[0]) === ERR_NOT_IN_RANGE) {
            creep.moveTo(damagedAllies[0]);
        }
    }
}


