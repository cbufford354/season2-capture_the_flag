import { getObjectsByPrototype, getTicks, getRange } from 'game/utils';
import { Flag, Creep, StructureContainer, StructureTower } from 'game/prototypes';
import { ERR_NOT_IN_RANGE, RESOURCE_ENERGY } from 'game/constants';
import { ATTACK, HEAL, RANGED_ATTACK, CARRY } from 'game';

const creepRoles = new Map();
const AGGRESSION_TICK = 1000;
export function loop() {

    let oppsFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    let myFlag = getObjectsByPrototype(Flag).find(object => object.my);
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my && !object.spawning);
    let opps = getObjectsByPrototype(Creep).filter(object => !object.my);
    let allContainers = getObjectsByPrototype(StructureContainer);
    let container = allContainers.sort((a, b) => getRange(a, myFlag) - getRange(b, myFlag));
    let myTower = getObjectsByPrototype(StructureTower).find(t => t.my);
    let lurkingOpps = opps.filter(opp => getRange(opp, myFlag) < 30);
    let weekOpps = [...lurkingOpps].sort((a, b) => a.hits - b.hits);
    let weakAllies = [...myCreeps].sort((a, b) => a.hits - b.hits);
    let forceAggressive = getTicks() > AGGRESSION_TICK; //lets get down to business
    let flagThreat = lurkingOpps.length > 0; // enemies still near flag
    let shouldDefend = !forceAggressive && (flagThreat || opps.length >= myCreeps.length);
    let leader = myCreeps.find(c => creepRoles.get(c.id) === 'grappler'); //follow the leader 
    let captureThreats = [...lurkingOpps].sort((a, b) => getRange(a, myFlag) - getRange(b, myFlag));




    // tower targets enemy healers first, then closest to flag
    let enemyHealers = opps.filter(opp => opp.body.some(p => p.type === HEAL));
    let towerTarget = myTower ?
        (enemyHealers.length > 0 ?
            myTower.findClosestByRange(enemyHealers) :
            lurkingOpps.length > 0 ?          // add this check
                myTower.findClosestByRange(lurkingOpps) :
                myTower.findClosestByRange(opps))  // fallback to all enemies
        : null;

    // debug logs every 10 ticks
    if (getTicks() % 10 === 0) {
        console.log(`${myCreeps.length > 1 ? `we ${myCreeps.length} are the ones who knock` : "LAST CREEP STANDING, stop knocking"}`);
        if (myTower) console.log(`Tower energy: ${myTower.store[RESOURCE_ENERGY]}/10`);
    }

    // assign roles once at the start
    for (let creep of myCreeps) {
        if (!creepRoles.has(creep.id)) {
            if (creep.body.some(p => p.type === CARRY) &&
                !creep.body.some(p => p.type === ATTACK) &&
                !creep.body.some(p => p.type === RANGED_ATTACK)) {
                creepRoles.set(creep.id, 'supplier');
            } else if (creep.body.some(p => p.type === HEAL)) {
                creepRoles.set(creep.id, 'doctor');
            } else if (creep.body.some(p => p.type === RANGED_ATTACK)) {
                creepRoles.set(creep.id, 'sniper');
            } else if (creep.body.some(p => p.type === ATTACK)) {
                creepRoles.set(creep.id, 'grappler');
            }
        }
    }

    // run roles
    for (let creep of myCreeps) {
        const role = creepRoles.get(creep.id);
        if (role === 'grappler') grappler(creep);
        else if (role === 'sniper') sniper(creep, leader);
        else if (role === 'doctor') doctor(creep, leader);
        else if (role === 'supplier') drugDealer(creep);
    }

    function grappler(creep) {
        if (shouldDefend) {
            if (weekOpps.length > 0) {
                creep.moveTo(captureThreats[0]);
                creep.attack(captureThreats[0]);
            } else {
                if (getRange(creep, myFlag) > 4) {
                    creep.moveTo(myFlag);
                }
            }
        } else {
            let nearbyOpps = opps.filter(opp => getRange(opp, creep) <= 1);
            if (nearbyOpps.length > 0) {
                creep.attack(nearbyOpps[0]);
            }
            creep.moveTo(oppsFlag);
        }
    }

    function sniper(creep, leader) {
        if (shouldDefend) {
            if (weekOpps.length === 0) return;
            let nearbyOpps = opps.filter(opp => getRange(opp, creep) <= 3);
            if (nearbyOpps.length >= 3) {
                creep.rangedMassAttack();
            } else if (creep.rangedAttack(captureThreats[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(captureThreats[0]);
            }
        } else {
            // stay within 3 tiles of leader before pushing
            if (leader && getRange(creep, leader) > 3) {
                creep.moveTo(leader); // catch up to the group
                return;
            }
            let nearbyOpps = opps.filter(opp => getRange(opp, creep) <= 3);
            if (nearbyOpps.length > 0) {
                creep.rangedAttack(nearbyOpps[0]);
            }
            creep.moveTo(oppsFlag);
        }
    }

    function doctor(creep, leader) {
        let damagedAllies = weakAllies.filter(ally => ally.hits < ally.hitsMax);

        if (shouldDefend) {
            // defensive - heal the most injured ally
            if (damagedAllies.length === 0) return; // everyone healthy, stand by
            if (creep.heal(damagedAllies[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(damagedAllies[0]);
            }
        } else {
            // stay within 2 tiles of leader
            if (leader && getRange(creep, leader) > 2) {
                creep.moveTo(leader); // stay glued to the group
                return;
            }
            if (damagedAllies.length > 0) {
                if (creep.heal(damagedAllies[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(damagedAllies[0]);
                }
            }
        }
    }

    function drugDealer(creep) {
        if (!creep.body.some(part => part.type === CARRY)) return;

        // tower full, go guard the flag instead
        if (myTower && myTower.store[RESOURCE_ENERGY] === myTower.store.getCapacity(RESOURCE_ENERGY)) {
            if (getRange(creep, myFlag) > 3) {
                creep.moveTo(myFlag);
            }
            return;
        }

        // stagger multiple suppliers using creep id to avoid conflicts
        const isEven = creep.id.charCodeAt(0) % 2 === 0;

        if (creep.store[RESOURCE_ENERGY] > 0) {
            if (myTower) {
                if (creep.transfer(myTower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(myTower);
                }
            }
        } else {
            // pick different containers if available to avoid crowding
            const targetContainer = isEven ? container[0] : (container[1] || container[0]);
            if (targetContainer) {
                if (creep.withdraw(targetContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetContainer);
                }
            }
        }
    }

    // fire tower
    if (myTower && towerTarget) {
        myTower.attack(towerTarget);
    }
}