import { getObjectsByPrototype } from 'game/utils';
import { Flag, Creep } from 'game/prototypes';
import { } from 'game/constants';
import { getTicks } from 'arena/season_beta/capture_the_flag/basic';
import { ATTACK, HEAL, RANGED_ATTACK } from 'game';

export function loop() {

    let enemyFlag = getObjectsByPrototype(Flag).find(object => !object.my);
    let myCreeps = getObjectsByPrototype(Creep).filter(object => object.my);
    let opps = getObjectsByPrototype(Creep).filter(object => !object.my)

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
        return
    }



}