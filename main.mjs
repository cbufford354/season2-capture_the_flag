import { getObjectsByPrototype, getTicks, getRange } from 'game/utils';
import { Flag, Creep, StructureContainer } from 'game/prototypes';
import { ERR_NOT_IN_RANGE, RESOURCE_ENERGY } from 'game/constants';
import { ATTACK, getObjectById, HEAL, RANGED_ATTACK } from 'game';

export function loop() {

    let oppsFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    let myFlag = getObjectsByPrototype(Flag).find(object => object.my)
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    let opps = getObjectsByPrototype(Creep).filter(object => !object.my)
    let container = getObjectsByPrototype(StructureContainer)

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
        console.log(`${myCreeps.length > 1 ? `we ${myCreeps.length}are the ones who knock ` : "LAST CREEP STANDING, stop knocking"} `);
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

    // while moving to enemy flag, attack any enemies within range
    function grappler(creep) {
        if (opps.length >= myCreeps.length) {
            if (weekOpps.length > 0) {
                creep.moveTo(weekOpps[0]);
                creep.attack(weekOpps[0]);
            } else {
                if (getRange(creep, myFlag) > 4) {
                    creep.moveTo(myFlag);
                }
            }
        } else {
            // offensive push, but attack anyone nearby on the way
            let nearbyOpps = opps.filter(opp => getRange(opp, creep) <= 1);
            if (nearbyOpps.length > 0) {
                creep.attack(nearbyOpps[0]);  // attack adjacent enemy
            }
            creep.moveTo(oppsFlag);  // keep moving regardless
        }
    }

    function sniper(creep) {
        if (opps.length <= myCreeps.length) {
            if (weekOpps.length === 0) return;
            if (creep.rangedAttack(weekOpps[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(weekOpps[0]);
            }
        } else {
            // offensive push, attack anyone within 3 tiles on the way
            let nearbyOpps = opps.filter(opp => getRange(opp, creep) <= 3);
            if (nearbyOpps.length > 0) {
                creep.rangedAttack(nearbyOpps[0]);
            }
            creep.moveTo(oppsFlag);
        }
    }
    function doctor(creep) {
        let damagedAllies = weakAllies.filter(ally => ally.hits < ally.hitsMax);
        if (opps.length >= myCreeps.length) {
            if (damagedAllies.length === 0) {
                // nothing to heal, go restock from container
                if (container[0]) {
                    if (creep.withdraw(container[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container[0]);
                    }
                }
                return;
            }
            if (creep.heal(damagedAllies[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(damagedAllies[0]);
            }
        } else {
            // winning, follow the grapplers to keep them healed on offense
            if (damagedAllies.length > 0) {
                if (creep.heal(damagedAllies[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(damagedAllies[0]);
                }
            } else {
                creep.moveTo(oppsFlag); // no one needs healing, push forward
            }
        }
    }

}
