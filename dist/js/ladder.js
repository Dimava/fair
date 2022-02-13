"use strict";
class Player {
    constructor() {
        return Vue.reactive(this);
    }
}
class Ranker {
    accountId = 0;
    username = '';
    points = 0;
    power = 1;
    bias = 0;
    multiplier = 1;
    you = false;
    growing = true;
    timesAsshole = 0;
    grapes = 0;
    vinegar = 0;
    rank = 0;
    autoPromote = false;
    history = [];
    interpolated = Vue.reactive({
        timeOffset: 0,
        rank: 0,
        points: 0,
        power: 0,
        history: [],
    });
    constructor() {
        return Vue.markRaw(this);
    }
    static from(source) {
        let ranker = source.you ? new YouRanker() : new Ranker();
        ranker.username = unescapeHtml(source.username);
        ranker.you = source.you;
        ranker.accountId = source.accountId;
        ranker.bias = source.bias;
        ranker.growing = source.growing;
        ranker.multiplier = source.multiplier;
        ranker.rank = source.rank;
        ranker.timesAsshole = source.timesAsshole;
        ranker.points = +source.points;
        ranker.power = +source.power;
        Object.assign(ranker.interpolated, {
            history: [],
            points: ranker.points,
            power: ranker.power,
            rank: ranker.rank,
            timeOffset: 0,
        });
        if (source.you) {
            let youSource = source;
            let youRanker = ranker;
            youRanker.autoPromote = youSource.autoPromote;
            youRanker.grapes = +youSource.grapes;
            youRanker.vinegar = +youSource.vinegar;
        }
        return ranker;
    }
    get powerFormatted() {
        return `${numberFormatter.format(this.interpolated.power)} [+${(this.bias + '').padStart(2, '0')} x${(this.multiplier + '').padStart(2, '0')}]`;
    }
    get pointsFormatted() {
        return numberFormatter.format(this.interpolated.points);
    }
    pushHistory(type, data, interpolated = false) {
        let currentRank = !interpolated ? this.rank : this.interpolated.rank;
        if (data.oldRank == 0)
            data.oldRank = currentRank;
        let history = !interpolated ? this.history : this.interpolated.history;
        let entry = {
            type,
            delta: currentRank - data.oldRank,
            rank: currentRank,
            ...data,
        };
        // Object.freeze(entry);
        history.unshift(entry);
        if (history.length > 30)
            history.pop();
        return entry;
    }
}
class YouRanker extends Ranker {
    you = true;
}
class FairLadder {
    socket;
    userData = new UserData();
    state = VueReactive({
        connected: false,
        connectionRequested: false,
        rankersById: {},
        vinegared: {
            justVinegared: false,
            vinegaredBy: new Ranker(),
            vinegarThrown: 0,
        },
        currentLadder: {
            number: 0,
        },
        yourRanker: new YouRanker(),
        firstRanker: new Ranker(),
        rankers: [new Ranker()],
        startRank: 0,
        infoData: {
            pointsForPromote: 250000000,
            minimumPeopleForPromote: 10,
            assholeLadder: 15,
            assholeTags: ["", "♠", "♣", "♥", "♦"],
            baseVinegarNeededToThrow: 1000000,
            baseGrapesNeededToAutoPromote: 2000,
            manualPromoteWaitTime: 15,
            autoPromoteLadder: 2
        },
        interpolated: {
            currentTime: 0,
            timeOffset: 0,
            rankers: [new Ranker()],
            realtimeStart: 0,
            realtimeEnd: 0,
        },
        pointsNeededForManualPromote: 0,
        currentTime: 0,
        updateEndRealtime: 0,
        updateStartRealtime: 0,
    });
    ladderSubscription;
    constructor() {
        return Vue.markRaw(this);
    }
    connect() {
        if (!this.socket)
            throw 0;
        if (!this.userData.uuid)
            throw 0;
        if (this.state.connected || this.state.connectionRequested)
            return false;
        this.state.connectionRequested = true;
        let resolveConnected;
        this.ladderSubscription = this.socket.subscribe('/topic/ladder/$ladderNum', (data) => {
            this.handleLadderUpdates(data);
        }, { uuid: this.userData.uuid }, this.userData.ladderNum);
        this.socket.subscribe('/user/queue/ladder/', (data) => {
            this.handleLadderInit(data);
            resolveConnected();
        }, { uuid: this.userData.uuid });
        this.socket.subscribe('/user/queue/ladder/updates', (data) => {
            this.handlePrivateLadderUpdates(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/ladder/init/$ladderNum', { uuid: this.userData.uuid }, this.userData.ladderNum);
        this.socket.subscribe('/user/queue/info', (data) => {
            this.handleInfo(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/info', { uuid: this.userData.uuid });
        return new Promise(resolve => { resolveConnected = resolve; });
    }
    disconnect() {
        // todo
    }
    handleLadderUpdates(message) {
        for (let event of message.events) {
            this.handleEvent(event);
        }
        this.calculateLadder(message.secondsPassed);
    }
    handleEvent(event) {
        console.log(event);
        let currentTime = this.state.currentTime;
        switch (event.eventType) {
            case 'BIAS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.bias++;
                ranker.points = 0;
                ranker.pushHistory('BIAS', { currentTime, oldRank: 0 });
                break;
            }
            case 'MULTI': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.multiplier++;
                ranker.bias = 0;
                ranker.points = 0;
                ranker.power = 0;
                ranker.pushHistory('MULTI', { currentTime, oldRank: 0 });
                break;
            }
            case 'VINEGAR': {
                let vinegarThrown = +event.data.amount;
                let ranker = this.state.rankersById[event.accountId];
                ranker.vinegar = 0;
                let target = this.state.firstRanker;
                if (target.you) {
                    if (event.data.success) {
                        this.state.vinegared = {
                            justVinegared: true,
                            vinegaredBy: ranker,
                            vinegarThrown,
                        };
                        // alert(ranker.username + " threw their "
                        // + numberFormatter.format(vinegarThrown)
                        // + " Vinegar at you and made you slip to the bottom of the ladder.");
                    }
                }
                target.vinegar = Math.max(0, target.vinegar - vinegarThrown);
                break;
            }
            case 'SOFT_RESET_POINTS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.points = 0;
                break;
            }
            case 'PROMOTE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.growing = false;
                if (event.accountId == this.userData.accountId) {
                    // let newLadderNum = ladderData.currentLadder.number + 1
                    // changeLadder(newLadderNum);
                    // changeChatRoom(newLadderNum);
                }
                break;
            }
            case 'AUTO_PROMOTE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.grapes -= this.getAutoPromoteGrapeCost(ranker.rank);
                ranker.autoPromote = true;
                break;
            }
            case 'JOIN': {
                let ranker = new Ranker();
                ranker.accountId = event.accountId;
                ranker.username = unescapeHtml(event.data.username);
                if (ranker.username.includes('\\u')) {
                    try {
                        ranker.username = JSON.parse(`"${ranker.username}"`);
                    }
                    catch { }
                }
                ranker.rank = this.state.rankers.length + 1;
                if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
                    this.state.rankers.push(ranker);
                    this.state.rankersById[ranker.accountId] = ranker;
                }
                break;
            }
            case 'NAME_CHANGE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.username = unescapeHtml(event.data);
                break;
            }
            case 'RESET': {
                // disconnect is made automatically
                location.reload();
                break;
            }
        }
    }
    handleInfo(message) {
        this.state.infoData = {
            assholeLadder: message.content.assholeLadder,
            assholeTags: message.content.assholeTags.map(unescapeHtml),
            autoPromoteLadder: message.content.autoPromoteLadder,
            baseGrapesNeededToAutoPromote: +message.content.baseGrapesNeededToAutoPromote,
            baseVinegarNeededToThrow: +message.content.baseVinegarNeededToThrow,
            manualPromoteWaitTime: message.content.manualPromoteWaitTime,
            minimumPeopleForPromote: message.content.minimumPeopleForPromote,
            pointsForPromote: +message.content.pointsForPromote,
        };
    }
    handlePrivateLadderUpdates(message) {
        for (let event of message.events) {
            this.handleEvent(event);
        }
    }
    handleLadderInit(message) {
        if (message.status === "OK") {
            if (message.content) {
                localStorage._ladder = JSON.stringify(message);
                console.log(message);
                this.state.currentLadder.number = message.content.currentLadder.number;
                this.state.startRank = message.content.startRank;
                this.state.rankers = message.content.rankers.map(e => Ranker.from(e));
                this.state.rankersById = Object.fromEntries(this.state.rankers.map(e => [e.accountId, e]));
                this.state.yourRanker = this.state.rankersById[message.content.yourRanker.accountId];
                this.state.firstRanker = this.state.rankers[0];
                this.state.interpolated = {
                    currentTime: 0,
                    rankers: this.state.rankers.slice(),
                    timeOffset: 0,
                    realtimeEnd: performance.now(),
                    realtimeStart: performance.now(),
                };
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.userData.accountId = this.state.yourRanker.accountId;
                this.userData.username = this.state.yourRanker.username;
                antd.message.success(`Connected to Ladder#${message.content.currentLadder.number} !`, 10);
            }
        }
    }
    calculateLadder(secondsPassed) {
        this.state.currentTime += secondsPassed;
        let currentTime = this.state.currentTime;
        this.state.updateStartRealtime = performance.now();
        // FIXME this uses 400ms per 8k rankers
        this.ensureSortedDescending(this.state.rankers, e => e.points);
        let ladderStats = {
            growingRankerCount: 0,
            pointsNeededForManualPromote: 0,
            eta: 0
        };
        this.state.rankers.forEach((ranker, index) => {
            let rank = index + 1;
            ranker.rank = rank;
            // If the ranker is currently still on ladder
            if (!ranker.growing)
                return;
            ladderStats.growingRankerCount += 1;
            // Calculating Points & Power
            if (rank != 1) {
                ranker.power += Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
            }
            ranker.points += Math.floor(ranker.power * secondsPassed);
            // Calculating Vinegar based on Grapes count
            if (rank == 1) {
                if (this.state.currentLadder.number === 1)
                    ranker.vinegar = Math.floor(ranker.vinegar * (0.9975 ** secondsPassed));
            }
            else {
                ranker.vinegar += Math.floor(ranker.grapes * secondsPassed);
            }
        });
        // let rankersOld = this.state.rankers.slice();
        // FIXME this uses 400ms per 8k rankers
        this.state.rankers.sort((a, b) => b.points - a.points);
        this.state.rankers.forEach((ranker, index, list) => {
            let newRank = index + 1;
            let oldRank = ranker.rank;
            if (newRank == oldRank)
                return;
            ranker.rank = newRank;
            if (newRank < oldRank)
                ranker.pushHistory('UPRANK', { currentTime, oldRank });
            else
                ranker.pushHistory('DOWNRANK', { currentTime, oldRank });
            if (newRank < oldRank) {
                // rank increase, gain grapes
                for (let r = oldRank; r < newRank; r++) {
                    // let otherRanker = rankersOld[r];
                    if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
                        ranker.grapes++;
                    }
                }
            }
        });
        // Ranker on Last Place gains 1 Grape, only if he isn't the only one
        if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            let lastRanker = this.state.rankers[this.state.rankers.length - 1];
            if (lastRanker.growing) {
                lastRanker.grapes += ~~secondsPassed;
                lastRanker.pushHistory('LAST', { currentTime, oldRank: 0 });
            }
        }
        this.state.firstRanker = this.state.rankers[0];
        this.calculateStats();
        this.state.interpolated = {
            currentTime: this.state.currentTime,
            rankers: this.state.rankers.slice(),
            timeOffset: 0,
            realtimeStart: performance.now(),
            realtimeEnd: performance.now(),
        };
        for (let ranker of this.state.rankers) {
            Object.assign(ranker.interpolated, {
                history: [],
                power: ranker.power,
                points: ranker.points,
                rank: ranker.rank,
                timeOffset: 0,
            });
        }
        this.state.updateEndRealtime = performance.now();
    }
    ensureSortedDescending(array, fn) {
        let prevValue = +Infinity;
        let sorted = true;
        for (let el of array) {
            let value = fn(el);
            if (value > prevValue) {
                sorted = false;
                break;
            }
            prevValue = value;
        }
        if (!sorted) {
            array.sort((a, b) => fn(b) - fn(a));
        }
    }
    calculateStats() {
        this.state.pointsNeededForManualPromote = this.calculatePointsNeededForManualPromote();
        // 	// ETA
        // 	// TODO: ETA
    }
    interpolateLadder(secondsOffset) {
        let currentTime = this.state.currentTime + secondsOffset;
        this.state.interpolated.currentTime = currentTime;
        this.state.interpolated.timeOffset = secondsOffset;
        this.state.interpolated.realtimeStart = performance.now();
        let secondsPassed = secondsOffset;
        this.ensureSortedDescending(this.state.interpolated.rankers, e => e.interpolated.points);
        this.state.interpolated.rankers.forEach((ranker, index) => {
            let rank = index + 1;
            ranker.interpolated.rank = rank;
            // If the ranker is currently still on ladder
            if (!ranker.growing)
                return;
            // Calculating Points & Power
            if (rank != 1) {
                ranker.interpolated.power = ranker.power + Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
            }
            ranker.interpolated.points = ranker.points + Math.floor(ranker.power * secondsPassed);
        });
        // let rankersOld = this.state.rankers.slice();
        // FIXME this uses 400ms per 8k rankers
        this.state.interpolated.rankers.sort((a, b) => b.interpolated.points - a.interpolated.points);
        this.state.interpolated.rankers.forEach((ranker, index, list) => {
            let newRank = index + 1;
            let oldRank = ranker.interpolated.rank;
            if (newRank == oldRank)
                return;
            ranker.interpolated.rank = newRank;
            if (newRank < oldRank)
                ranker.pushHistory('UPRANK', { currentTime, oldRank }, true);
            else
                ranker.pushHistory('DOWNRANK', { currentTime, oldRank }, true);
        });
        this.state.interpolated.realtimeEnd = performance.now();
    }
    calculatePointsNeededForManualPromote() {
        let infoData = this.state.infoData;
        if (this.state.rankers.length < Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            return Infinity;
        }
        if (this.state.firstRanker.points < infoData.pointsForPromote) {
            return infoData.pointsForPromote;
        }
        let firstRanker = this.state.firstRanker;
        let secondRanker = this.state.rankers[1];
        if (this.state.currentLadder.number < infoData.autoPromoteLadder) {
            if (!firstRanker.you)
                return firstRanker.points + 1;
            return secondRanker.points + 1;
        }
        let leadingRanker = firstRanker;
        let pursuingRanker = firstRanker.you ? secondRanker : firstRanker;
        // How many more points does the ranker gain against his pursuer, every Second
        let powerDiff = (leadingRanker.growing ? pursuingRanker.power : 0) - (pursuingRanker.growing ? pursuingRanker.power : 0);
        // Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
        let neededPointDiff = Math.abs(powerDiff * infoData.manualPromoteWaitTime);
        return Math.max((leadingRanker.you ? pursuingRanker : leadingRanker).points + neededPointDiff, infoData.pointsForPromote);
    }
    request(type) {
        if (!this.socket)
            throw 0;
        if (!this.canRequest(type, this.state.yourRanker.accountId)) {
            console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.yourRanker), type);
            return;
        }
        this.socket.send(`/app/ladder/post/${type}`, { uuid: this.userData.uuid });
    }
    fakeUpdate(secondsPassed = 1) {
        this.calculateLadder(secondsPassed);
    }
    fakeRequest(eventType, accountId = this.state.yourRanker.accountId) {
        if (!this.canRequest(eventType.toLowerCase().replace(/_/g, '-'), accountId)) {
            console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.rankersById[accountId]), eventType);
        }
        switch (eventType) {
            case 'BIAS':
            case 'MULTI':
            case 'SOFT_RESET_POINTS':
            case 'PROMOTE':
            case 'AUTO_PROMOTE':
                this.handleEvent({ eventType, accountId });
                break;
            case 'VINEGAR': {
                let target = this.state.rankers[0];
                let source = this.state.rankersById[accountId];
                this.handleEvent({
                    eventType, accountId, data: {
                        amount: source.vinegar + '',
                        success: source.vinegar > target.vinegar,
                    }
                });
                break;
            }
            default:
                eventType;
                console.error('not implemented', { fakeRequest: true, eventType, accountId });
                alert('not implemented');
        }
        this.calculateLadder(0);
    }
    getUpgradeCost(level) {
        return Math.round(Math.pow(this.state.currentLadder.number + 1, level));
    }
    getVinegarThrowCost() {
        return this.state.infoData.baseVinegarNeededToThrow * this.state.currentLadder.number;
    }
    getAutoPromoteGrapeCost(rank) {
        let infoData = this.state.infoData;
        let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
        let divisor = Math.max(rank - minPeople + 1, 1);
        return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
    }
    getBiasCost(ranker = this.state.yourRanker) {
        return this.getUpgradeCost(ranker.bias + 1);
    }
    getMultiplierCost(ranker = this.state.yourRanker) {
        return this.getUpgradeCost(ranker.multiplier + 1);
    }
    canRequest(type, accountId = this.state.yourRanker.accountId) {
        let ranker = this.state.rankersById[accountId];
        switch (type) {
            case 'bias': {
                return this.getBiasCost(ranker) <= ranker.points;
            }
            case 'multi': {
                return this.getMultiplierCost(ranker) <= ranker.power;
            }
            case 'vinegar': {
                return this.getVinegarThrowCost() <= ranker.vinegar;
            }
            case 'promote': {
                return !!'TODO';
            }
            case 'auto-promote': {
                return !!'TODO';
            }
            case 'asshole': {
                return !!'TODO';
            }
            default:
                return false;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBZ0JELE1BQU0sTUFBTTtJQUNYLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsUUFBUSxHQUFXLEVBQUUsQ0FBQztJQUN0QixNQUFNLEdBQVcsQ0FBQyxDQUFDO0lBQ25CLEtBQUssR0FBVyxDQUFDLENBQUM7SUFDbEIsSUFBSSxHQUFXLENBQUMsQ0FBQztJQUNqQixVQUFVLEdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLEdBQUcsR0FBWSxLQUFLLENBQUM7SUFDckIsT0FBTyxHQUFZLElBQUksQ0FBQztJQUN4QixZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsT0FBTyxHQUFXLENBQUMsQ0FBQztJQUVwQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFdBQVcsR0FBWSxLQUFLLENBQUM7SUFFN0IsT0FBTyxHQUF5RCxFQUFFLENBQUM7SUFFbkUsWUFBWSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDM0IsVUFBVSxFQUFFLENBQUM7UUFDYixJQUFJLEVBQUUsQ0FBQztRQUNQLE1BQU0sRUFBRSxDQUFDO1FBQ1QsS0FBSyxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsRUFBMEQ7S0FDbkUsQ0FBQyxDQUFDO0lBRUg7UUFDQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUlELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBc0M7UUFDakQsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUN6RCxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNwQyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUN0QyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDMUIsTUFBTSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUNsQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDbkIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ2pCLFVBQVUsRUFBRSxDQUFDO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxTQUFTLEdBQUcsTUFBeUIsQ0FBQztZQUMxQyxJQUFJLFNBQVMsR0FBRyxNQUFtQixDQUFDO1lBQ3BDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztZQUM5QyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUNyQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztTQUN2QztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FDdkQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUMzQyxHQUFHLENBQUM7SUFDTixDQUFDO0lBQ0QsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxXQUFXLENBQ1YsSUFBTyxFQUFFLElBQStELEVBQ3hFLFlBQVksR0FBRyxLQUFLO1FBRXBCLElBQUksV0FBVyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztRQUNyRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQztZQUFFLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDO1FBQ2xELElBQUksT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztRQUV2RSxJQUFJLEtBQUssR0FBeUY7WUFDakcsSUFBSTtZQUNKLEtBQUssRUFBRSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU87WUFDakMsSUFBSSxFQUFFLFdBQVc7WUFDakIsR0FBRyxJQUFJO1NBQ1AsQ0FBQztRQUNGLHdCQUF3QjtRQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLEtBQTJELENBQUMsQ0FBQztRQUM3RSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsRUFBRTtZQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QyxPQUFPLEtBQWlDLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBQ0QsTUFBTSxTQUFVLFNBQVEsTUFBTTtJQUM3QixHQUFHLEdBQUcsSUFBSSxDQUFDO0NBQ1g7QUFHRCxNQUFNLFVBQVU7SUFDZixNQUFNLENBQWM7SUFDcEIsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7SUFDMUIsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUNuQixTQUFTLEVBQUUsS0FBSztRQUNoQixtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLFdBQVcsRUFBRSxFQUErQjtRQUU1QyxTQUFTLEVBQUU7WUFDVixhQUFhLEVBQUUsS0FBSztZQUNwQixXQUFXLEVBQUUsSUFBSSxNQUFNLEVBQUU7WUFDekIsYUFBYSxFQUFFLENBQUM7U0FDaEI7UUFFRCxhQUFhLEVBQUU7WUFDZCxNQUFNLEVBQUUsQ0FBQztTQUNUO1FBQ0QsVUFBVSxFQUFFLElBQUksU0FBUyxFQUFFO1FBQzNCLFdBQVcsRUFBRSxJQUFJLE1BQU0sRUFBRTtRQUN6QixPQUFPLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLFNBQVMsRUFBRSxDQUFDO1FBRVosUUFBUSxFQUFFO1lBQ1QsZ0JBQWdCLEVBQUUsU0FBUztZQUMzQix1QkFBdUIsRUFBRSxFQUFFO1lBQzNCLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDckMsd0JBQXdCLEVBQUUsT0FBTztZQUNqQyw2QkFBNkIsRUFBRSxJQUFJO1lBQ25DLHFCQUFxQixFQUFFLEVBQUU7WUFDekIsaUJBQWlCLEVBQUUsQ0FBQztTQUNwQjtRQUVELFlBQVksRUFBRTtZQUNiLFdBQVcsRUFBRSxDQUFDO1lBQ2QsVUFBVSxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLFdBQVcsRUFBRSxDQUFDO1NBQ2Q7UUFFRCw0QkFBNEIsRUFBRSxDQUFDO1FBRS9CLFdBQVcsRUFBRSxDQUFDO1FBQ2QsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixtQkFBbUIsRUFBRSxDQUFDO0tBQ3RCLENBQUMsQ0FBQztJQUNILGtCQUFrQixDQUFNO0lBQ3hCO1FBQ0MsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN6RSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUN0QyxJQUFJLGdCQUE0QixDQUFDO1FBRWpDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3BGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVCLGdCQUFnQixFQUFFLENBQUM7UUFDcEIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRWpDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUMzQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNsRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUN6QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFakMsT0FBTyxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRSxHQUFHLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFDRCxVQUFVO1FBQ1QsT0FBTztJQUNSLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxPQUFtRTtRQUN0RixLQUFLLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN4QjtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBd0I7UUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUV6QyxRQUFRLEtBQUssQ0FBQyxTQUFTLEVBQUU7WUFDeEIsS0FBSyxNQUFNLENBQUMsQ0FBQztnQkFDWixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hELE1BQU07YUFDTjtZQUNELEtBQUssT0FBTyxDQUFDLENBQUM7Z0JBQ2IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQixNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNO2FBQ047WUFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNmLElBQUksYUFBYSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7Z0JBQ25CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO2dCQUNwQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUU7b0JBQ2YsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUc7NEJBQ3RCLGFBQWEsRUFBRSxJQUFJOzRCQUNuQixXQUFXLEVBQUUsTUFBTTs0QkFDbkIsYUFBYTt5QkFDYixDQUFDO3dCQUNGLDBDQUEwQzt3QkFDMUMsMENBQTBDO3dCQUMxQyx1RUFBdUU7cUJBQ3ZFO2lCQUNEO2dCQUNELE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztnQkFDN0QsTUFBTTthQUNOO1lBQ0QsS0FBSyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNsQixNQUFNO2FBQ047WUFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNmLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBRXZCLElBQUksS0FBSyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtvQkFDL0MseURBQXlEO29CQUN6RCw4QkFBOEI7b0JBQzlCLGdDQUFnQztpQkFDaEM7Z0JBQ0QsTUFBTTthQUNOO1lBQ0QsS0FBSyxjQUFjLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNELE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUMxQixNQUFNO2FBQ047WUFDRCxLQUFLLE1BQU0sQ0FBQyxDQUFDO2dCQUNaLElBQUksTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDcEMsSUFBSTt3QkFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtxQkFBRTtvQkFBQyxNQUFNLEdBQUc7aUJBQ3RFO2dCQUNELE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFO29CQUNsRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUM7aUJBQ2xEO2dCQUNELE1BQU07YUFDTjtZQUNELEtBQUssYUFBYSxDQUFDLENBQUM7Z0JBQ25CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxNQUFNO2FBQ047WUFDRCxLQUFLLE9BQU8sQ0FBQyxDQUFDO2dCQUNiLG1DQUFtQztnQkFDbkMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixNQUFNO2FBQ047U0FDRDtJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBMkQ7UUFDckUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUc7WUFDckIsYUFBYSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUM1QyxXQUFXLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztZQUMxRCxpQkFBaUIsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLGlCQUFpQjtZQUNwRCw2QkFBNkIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsNkJBQTZCO1lBQzdFLHdCQUF3QixFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0I7WUFDbkUscUJBQXFCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUI7WUFDNUQsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUI7WUFDaEUsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQjtTQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVELDBCQUEwQixDQUFDLE9BQXFFO1FBQy9GLEtBQUssSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3hCO0lBQ0YsQ0FBQztJQUVELGdCQUFnQixDQUFDLE9BQThEO1FBQzlFLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDNUIsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUNwQixZQUFZLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFjLENBQUM7Z0JBQ2xHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRztvQkFDekIsV0FBVyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtvQkFDbkMsVUFBVSxFQUFFLENBQUM7b0JBQ2IsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLEVBQUU7b0JBQzlCLGFBQWEsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFO2lCQUNoQyxDQUFDO2dCQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0JBRTVCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUV4RCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDbkIsdUJBQXVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxFQUMvRCxFQUFFLENBQ0YsQ0FBQzthQUNGO1NBQ0Q7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLGFBQXFCO1FBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLGFBQWEsQ0FBQztRQUN4QyxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNuRCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRS9ELElBQUksV0FBVyxHQUFHO1lBQ2pCLGtCQUFrQixFQUFFLENBQUM7WUFDckIsNEJBQTRCLEVBQUUsQ0FBQztZQUMvQixHQUFHLEVBQUUsQ0FBQztTQUNOLENBQUE7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNyQixNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNuQiw2Q0FBNkM7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUFFLE9BQU87WUFDNUIsV0FBVyxDQUFDLGtCQUFrQixJQUFJLENBQUMsQ0FBQztZQUVwQyw2QkFBNkI7WUFDN0IsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNkLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLEdBQUcsYUFBYSxDQUFDLENBQUM7YUFDekY7WUFDRCxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsQ0FBQztZQUcxRCw0Q0FBNEM7WUFDNUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNkLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUM7b0JBQ3hDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUM7YUFDekU7aUJBQU07Z0JBQ04sTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUE7YUFDM0Q7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNsRCxJQUFJLE9BQU8sR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDMUIsSUFBSSxPQUFPLElBQUksT0FBTztnQkFBRSxPQUFPO1lBRS9CLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBRXRCLElBQUksT0FBTyxHQUFHLE9BQU87Z0JBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7O2dCQUV2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBRTFELElBQUksT0FBTyxHQUFHLE9BQU8sRUFBRTtnQkFDdEIsNkJBQTZCO2dCQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN2QyxtQ0FBbUM7b0JBQ25DLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUU7d0JBQ2pFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztxQkFDaEI7aUJBQ0Q7YUFDRDtRQUVGLENBQUMsQ0FBQyxDQUFDO1FBRUgsb0VBQW9FO1FBQ3BFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDeEgsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25FLElBQUksVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDdkIsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDO2dCQUNyQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM1RDtTQUNEO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHO1lBQ3pCLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNuQyxVQUFVLEVBQUUsQ0FBQztZQUNiLGFBQWEsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ2hDLFdBQVcsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFO1NBQzlCLENBQUE7UUFDRCxLQUFLLElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtnQkFDbEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO2dCQUNuQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07Z0JBQ3JCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtnQkFDakIsVUFBVSxFQUFFLENBQUM7YUFDYixDQUFDLENBQUM7U0FDSDtRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2xELENBQUM7SUFFRCxzQkFBc0IsQ0FBSSxLQUFVLEVBQUUsRUFBcUI7UUFDMUQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDMUIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLEtBQUssSUFBSSxFQUFFLElBQUksS0FBSyxFQUFFO1lBQ3JCLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQixJQUFJLEtBQUssR0FBRyxTQUFTLEVBQUU7Z0JBQ3RCLE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQ2YsTUFBTTthQUNOO1lBQ0QsU0FBUyxHQUFHLEtBQUssQ0FBQztTQUNsQjtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BDO0lBQ0YsQ0FBQztJQUVELGNBQWM7UUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDO1FBQ3ZGLFVBQVU7UUFDVixnQkFBZ0I7SUFDakIsQ0FBQztJQUVELGlCQUFpQixDQUFDLGFBQXFCO1FBQ3RDLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQztRQUN6RCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUM7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxRCxJQUFJLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFFbEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN6RCxJQUFJLElBQUksR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNoQyw2Q0FBNkM7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUFFLE9BQU87WUFFNUIsNkJBQTZCO1lBQzdCLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDZCxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDO2FBQ3BIO1lBQ0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQy9ELElBQUksT0FBTyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDeEIsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDdkMsSUFBSSxPQUFPLElBQUksT0FBTztnQkFBRSxPQUFPO1lBRS9CLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztZQUVuQyxJQUFJLE9BQU8sR0FBRyxPQUFPO2dCQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQzs7Z0JBRTdELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0lBR0QscUNBQXFDO1FBQ3BDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQ25DLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzVHLE9BQU8sUUFBUSxDQUFDO1NBQ2hCO1FBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixFQUFFO1lBQzlELE9BQU8sUUFBUSxDQUFDLGdCQUFnQixDQUFDO1NBQ2pDO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDekMsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFO1lBQ2pFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRztnQkFBRSxPQUFPLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3BELE9BQU8sWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDL0I7UUFFRCxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7UUFDaEMsSUFBSSxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFFbEUsOEVBQThFO1FBQzlFLElBQUksU0FBUyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6SCxpSEFBaUg7UUFDakgsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFM0UsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUNkLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEdBQUcsZUFBZSxFQUM3RSxRQUFRLENBQUMsZ0JBQWdCLENBQ3pCLENBQUM7SUFDSCxDQUFDO0lBR0QsT0FBTyxDQUFDLElBQTJFO1FBQ2xGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRixPQUFPO1NBQ1A7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxVQUFVLENBQUMsZ0JBQXdCLENBQUM7UUFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQ0QsV0FBVyxDQUFDLFNBQXlDLEVBQUUsWUFBdUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUztRQUM1RyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtZQUNuRixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNyRztRQUNELFFBQVEsU0FBUyxFQUFFO1lBQ2xCLEtBQUssTUFBTSxDQUFDO1lBQ1osS0FBSyxPQUFPLENBQUM7WUFDYixLQUFLLG1CQUFtQixDQUFDO1lBQ3pCLEtBQUssU0FBUyxDQUFDO1lBQ2YsS0FBSyxjQUFjO2dCQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNuRCxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNmLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQztvQkFDaEIsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7d0JBQzNCLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUU7d0JBQzNCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPO3FCQUN4QztpQkFDRCxDQUFDLENBQUM7Z0JBQUMsTUFBTTthQUNWO1lBQ0Q7Z0JBQ0MsU0FBUyxDQUFDO2dCQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUMxQjtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUlELGNBQWMsQ0FBQyxLQUFhO1FBQzNCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBQ3ZGLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxJQUFZO1FBQ25DLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQ25DLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVGLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsV0FBVyxDQUFDLFNBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVTtRQUNqRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsaUJBQWlCLENBQUMsU0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxVQUFVLENBQUMsSUFBMkUsRUFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUztRQUNsSSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQyxRQUFRLElBQUksRUFBRTtZQUNiLEtBQUssTUFBTSxDQUFDLENBQUM7Z0JBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUM7YUFDakQ7WUFDRCxLQUFLLE9BQU8sQ0FBQyxDQUFDO2dCQUNiLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDdEQ7WUFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNmLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQzthQUNwRDtZQUNELEtBQUssU0FBUyxDQUFDLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO2FBQ2hCO1lBQ0QsS0FBSyxjQUFjLENBQUMsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO2FBQ2hCO1lBQ0QsS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7YUFDaEI7WUFDRDtnQkFDQyxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0YsQ0FBQztDQUVEIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5cclxuY2xhc3MgUGxheWVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHJldHVybiBWdWUucmVhY3RpdmUodGhpcyk7XHJcblx0fVxyXG59XHJcblxyXG50eXBlIF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PFQgZXh0ZW5kcyBzdHJpbmcsIEQgZXh0ZW5kcyB7fSA9IHt9PiA9IHtcclxuXHR0eXBlOiBULCBkZWx0YTogbnVtYmVyLCByYW5rOiBudW1iZXIsIG9sZFJhbms6IG51bWJlciwgY3VycmVudFRpbWU6IG51bWJlcixcclxufSAmIEQ7XHJcblxyXG50eXBlIFJhbmtlckhpc3RvcnlFdmVudE1hcCA9IHtcclxuXHQnVVBSQU5LJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J1VQUkFOSyc+LFxyXG5cdCdET1dOUkFOSyc6IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PCdET1dOUkFOSyc+LFxyXG5cdCdNVUxUSSc6IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PCdNVUxUSSc+LFxyXG5cdCdCSUFTJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0JJQVMnPixcclxuXHQnTEFTVCc6IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PCdMQVNUJz4sXHJcblx0J1RIUk9XX1ZJTkVHQVInOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnVEhST1dfVklORUdBUicsIHsgdGFyZ2V0OiBhY2NvdW50SWQsIGFtb3VudDogbnVtYmVyLCBzdWNjZXNzOiBib29sZWFuIH0+LFxyXG5cdCdHT1RfVklORUdBUkVEJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0dPVF9WSU5FR0FSRUQnLCB7IHNvdXJjZTogYWNjb3VudElkLCBhbW91bnQ6IG51bWJlciwgc3VjY2VzczogYm9vbGVhbiB9PixcclxufTtcclxuXHJcbmNsYXNzIFJhbmtlciB7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHVzZXJuYW1lOiBzdHJpbmcgPSAnJztcclxuXHRwb2ludHM6IG51bWJlciA9IDA7XHJcblx0cG93ZXI6IG51bWJlciA9IDE7XHJcblx0YmlhczogbnVtYmVyID0gMDtcclxuXHRtdWx0aXBsaWVyOiBudW1iZXIgPSAxO1xyXG5cdHlvdTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdGdyb3dpbmc6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHRpbWVzQXNzaG9sZTogbnVtYmVyID0gMDtcclxuXHRncmFwZXM6IG51bWJlciA9IDA7XHJcblx0dmluZWdhcjogbnVtYmVyID0gMDtcclxuXHJcblx0cmFuazogbnVtYmVyID0gMDtcclxuXHRhdXRvUHJvbW90ZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRoaXN0b3J5OiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBba2V5b2YgUmFua2VySGlzdG9yeUV2ZW50TWFwXVtdID0gW107XHJcblxyXG5cdGludGVycG9sYXRlZCA9IFZ1ZS5yZWFjdGl2ZSh7XHJcblx0XHR0aW1lT2Zmc2V0OiAwLFxyXG5cdFx0cmFuazogMCxcclxuXHRcdHBvaW50czogMCxcclxuXHRcdHBvd2VyOiAwLFxyXG5cdFx0aGlzdG9yeTogW10gYXMgUmFua2VySGlzdG9yeUV2ZW50TWFwW2tleW9mIFJhbmtlckhpc3RvcnlFdmVudE1hcF1bXSxcclxuXHR9KTtcclxuXHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRyZXR1cm4gVnVlLm1hcmtSYXcodGhpcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFlvdVJhbmtlcik6IFlvdVJhbmtlcjtcclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFJhbmtlcik6IFJhbmtlcjtcclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFJhbmtlciB8IFNvY2tldFlvdVJhbmtlcik6IFJhbmtlciB8IFlvdVJhbmtlciB7XHJcblx0XHRsZXQgcmFua2VyID0gc291cmNlLnlvdSA/IG5ldyBZb3VSYW5rZXIoKSA6IG5ldyBSYW5rZXIoKTtcclxuXHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChzb3VyY2UudXNlcm5hbWUpO1xyXG5cdFx0cmFua2VyLnlvdSA9IHNvdXJjZS55b3U7XHJcblx0XHRyYW5rZXIuYWNjb3VudElkID0gc291cmNlLmFjY291bnRJZDtcclxuXHRcdHJhbmtlci5iaWFzID0gc291cmNlLmJpYXM7XHJcblx0XHRyYW5rZXIuZ3Jvd2luZyA9IHNvdXJjZS5ncm93aW5nO1xyXG5cdFx0cmFua2VyLm11bHRpcGxpZXIgPSBzb3VyY2UubXVsdGlwbGllcjtcclxuXHRcdHJhbmtlci5yYW5rID0gc291cmNlLnJhbms7XHJcblx0XHRyYW5rZXIudGltZXNBc3Nob2xlID0gc291cmNlLnRpbWVzQXNzaG9sZTtcclxuXHRcdHJhbmtlci5wb2ludHMgPSArc291cmNlLnBvaW50cztcclxuXHRcdHJhbmtlci5wb3dlciA9ICtzb3VyY2UucG93ZXI7XHJcblx0XHRPYmplY3QuYXNzaWduKHJhbmtlci5pbnRlcnBvbGF0ZWQsIHtcclxuXHRcdFx0aGlzdG9yeTogW10sXHJcblx0XHRcdHBvaW50czogcmFua2VyLnBvaW50cyxcclxuXHRcdFx0cG93ZXI6IHJhbmtlci5wb3dlcixcclxuXHRcdFx0cmFuazogcmFua2VyLnJhbmssXHJcblx0XHRcdHRpbWVPZmZzZXQ6IDAsXHJcblx0XHR9KTtcclxuXHRcdGlmIChzb3VyY2UueW91KSB7XHJcblx0XHRcdGxldCB5b3VTb3VyY2UgPSBzb3VyY2UgYXMgU29ja2V0WW91UmFua2VyO1xyXG5cdFx0XHRsZXQgeW91UmFua2VyID0gcmFua2VyIGFzIFlvdVJhbmtlcjtcclxuXHRcdFx0eW91UmFua2VyLmF1dG9Qcm9tb3RlID0geW91U291cmNlLmF1dG9Qcm9tb3RlO1xyXG5cdFx0XHR5b3VSYW5rZXIuZ3JhcGVzID0gK3lvdVNvdXJjZS5ncmFwZXM7XHJcblx0XHRcdHlvdVJhbmtlci52aW5lZ2FyID0gK3lvdVNvdXJjZS52aW5lZ2FyO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJhbmtlcjtcclxuXHR9XHJcblxyXG5cdGdldCBwb3dlckZvcm1hdHRlZCgpIHtcclxuXHRcdHJldHVybiBgJHtudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KHRoaXMuaW50ZXJwb2xhdGVkLnBvd2VyKVxyXG5cdFx0XHR9IFsrJHsodGhpcy5iaWFzICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fSB4JHsodGhpcy5tdWx0aXBsaWVyICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fV1gO1xyXG5cdH1cclxuXHRnZXQgcG9pbnRzRm9ybWF0dGVkKCkge1xyXG5cdFx0cmV0dXJuIG51bWJlckZvcm1hdHRlci5mb3JtYXQodGhpcy5pbnRlcnBvbGF0ZWQucG9pbnRzKTtcclxuXHR9XHJcblxyXG5cdHB1c2hIaXN0b3J5PFQgZXh0ZW5kcyBrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXA+KFxyXG5cdFx0dHlwZTogVCwgZGF0YTogT21pdDxSYW5rZXJIaXN0b3J5RXZlbnRNYXBbVF0sICd0eXBlJyB8ICdkZWx0YScgfCAncmFuayc+LFxyXG5cdFx0aW50ZXJwb2xhdGVkID0gZmFsc2UsXHJcblx0KSB7XHJcblx0XHRsZXQgY3VycmVudFJhbmsgPSAhaW50ZXJwb2xhdGVkID8gdGhpcy5yYW5rIDogdGhpcy5pbnRlcnBvbGF0ZWQucmFuaztcclxuXHRcdGlmIChkYXRhLm9sZFJhbmsgPT0gMCkgZGF0YS5vbGRSYW5rID0gY3VycmVudFJhbms7XHJcblx0XHRsZXQgaGlzdG9yeSA9ICFpbnRlcnBvbGF0ZWQgPyB0aGlzLmhpc3RvcnkgOiB0aGlzLmludGVycG9sYXRlZC5oaXN0b3J5O1xyXG5cclxuXHRcdGxldCBlbnRyeTogUmFua2VySGlzdG9yeUV2ZW50TWFwW2tleW9mIFJhbmtlckhpc3RvcnlFdmVudE1hcF0gfCBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDxzdHJpbmc+ID0ge1xyXG5cdFx0XHR0eXBlLFxyXG5cdFx0XHRkZWx0YTogY3VycmVudFJhbmsgLSBkYXRhLm9sZFJhbmssXHJcblx0XHRcdHJhbms6IGN1cnJlbnRSYW5rLFxyXG5cdFx0XHQuLi5kYXRhLFxyXG5cdFx0fTtcclxuXHRcdC8vIE9iamVjdC5mcmVlemUoZW50cnkpO1xyXG5cdFx0aGlzdG9yeS51bnNoaWZ0KGVudHJ5IGFzIFJhbmtlckhpc3RvcnlFdmVudE1hcFtrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBdKTtcclxuXHRcdGlmIChoaXN0b3J5Lmxlbmd0aCA+IDMwKSBoaXN0b3J5LnBvcCgpO1xyXG5cdFx0cmV0dXJuIGVudHJ5IGFzIFJhbmtlckhpc3RvcnlFdmVudE1hcFtUXTtcclxuXHR9XHJcbn1cclxuY2xhc3MgWW91UmFua2VyIGV4dGVuZHMgUmFua2VyIHtcclxuXHR5b3UgPSB0cnVlO1xyXG59XHJcblxyXG5cclxuY2xhc3MgRmFpckxhZGRlciB7XHJcblx0c29ja2V0PzogRmFpclNvY2tldDtcclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlUmVhY3RpdmUoe1xyXG5cdFx0Y29ubmVjdGVkOiBmYWxzZSxcclxuXHRcdGNvbm5lY3Rpb25SZXF1ZXN0ZWQ6IGZhbHNlLFxyXG5cdFx0cmFua2Vyc0J5SWQ6IHt9IGFzIFJlY29yZDxhY2NvdW50SWQsIFJhbmtlcj4sXHJcblxyXG5cdFx0dmluZWdhcmVkOiB7XHJcblx0XHRcdGp1c3RWaW5lZ2FyZWQ6IGZhbHNlLFxyXG5cdFx0XHR2aW5lZ2FyZWRCeTogbmV3IFJhbmtlcigpLFxyXG5cdFx0XHR2aW5lZ2FyVGhyb3duOiAwLFxyXG5cdFx0fSxcclxuXHJcblx0XHRjdXJyZW50TGFkZGVyOiB7XHJcblx0XHRcdG51bWJlcjogMCxcclxuXHRcdH0sXHJcblx0XHR5b3VyUmFua2VyOiBuZXcgWW91UmFua2VyKCksXHJcblx0XHRmaXJzdFJhbmtlcjogbmV3IFJhbmtlcigpLFxyXG5cdFx0cmFua2VyczogW25ldyBSYW5rZXIoKV0sXHJcblx0XHRzdGFydFJhbms6IDAsXHJcblxyXG5cdFx0aW5mb0RhdGE6IHtcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogMjUwMDAwMDAwLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogMTAsXHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IDE1LFxyXG5cdFx0XHRhc3Nob2xlVGFnczogW1wiXCIsIFwi4pmgXCIsIFwi4pmjXCIsIFwi4pmlXCIsIFwi4pmmXCJdLFxyXG5cdFx0XHRiYXNlVmluZWdhck5lZWRlZFRvVGhyb3c6IDEwMDAwMDAsXHJcblx0XHRcdGJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlOiAyMDAwLFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IDE1LFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogMlxyXG5cdFx0fSxcclxuXHJcblx0XHRpbnRlcnBvbGF0ZWQ6IHtcclxuXHRcdFx0Y3VycmVudFRpbWU6IDAsXHJcblx0XHRcdHRpbWVPZmZzZXQ6IDAsXHJcblx0XHRcdHJhbmtlcnM6IFtuZXcgUmFua2VyKCldLFxyXG5cdFx0XHRyZWFsdGltZVN0YXJ0OiAwLFxyXG5cdFx0XHRyZWFsdGltZUVuZDogMCxcclxuXHRcdH0sXHJcblxyXG5cdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHJcblx0XHRjdXJyZW50VGltZTogMCxcclxuXHRcdHVwZGF0ZUVuZFJlYWx0aW1lOiAwLFxyXG5cdFx0dXBkYXRlU3RhcnRSZWFsdGltZTogMCxcclxuXHR9KTtcclxuXHRsYWRkZXJTdWJzY3JpcHRpb246IGFueTtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHJldHVybiBWdWUubWFya1Jhdyh0aGlzKTtcclxuXHR9XHJcblx0Y29ubmVjdCgpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMudXNlckRhdGEudXVpZCkgdGhyb3cgMDtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmNvbm5lY3RlZCB8fCB0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRsZXQgcmVzb2x2ZUNvbm5lY3RlZDogKCkgPT4gdm9pZDtcclxuXHJcblx0XHR0aGlzLmxhZGRlclN1YnNjcmlwdGlvbiA9IHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy51c2VyRGF0YS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvbGFkZGVyLycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlTGFkZGVySW5pdChkYXRhKTtcclxuXHRcdFx0cmVzb2x2ZUNvbm5lY3RlZCgpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2xhZGRlci9pbml0LyRsYWRkZXJOdW0nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy51c2VyRGF0YS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvaW5mbycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlSW5mbyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvaW5mbydcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7IHJlc29sdmVDb25uZWN0ZWQgPSByZXNvbHZlOyB9KTtcclxuXHR9XHJcblx0ZGlzY29ubmVjdCgpIHtcclxuXHRcdC8vIHRvZG9cclxuXHR9XHJcblxyXG5cdGhhbmRsZUxhZGRlclVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihtZXNzYWdlLnNlY29uZHNQYXNzZWQpO1xyXG5cdH1cclxuXHJcblx0aGFuZGxlRXZlbnQoZXZlbnQ6IFNvY2tldExhZGRlckV2ZW50KSB7XHJcblx0XHRjb25zb2xlLmxvZyhldmVudCk7XHJcblx0XHRsZXQgY3VycmVudFRpbWUgPSB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cclxuXHRcdHN3aXRjaCAoZXZlbnQuZXZlbnRUeXBlKSB7XHJcblx0XHRcdGNhc2UgJ0JJQVMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuYmlhcysrO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnQklBUycsIHsgY3VycmVudFRpbWUsIG9sZFJhbms6IDAgfSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnTVVMVEknOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIubXVsdGlwbGllcisrO1xyXG5cdFx0XHRcdHJhbmtlci5iaWFzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG93ZXIgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnTVVMVEknLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rOiAwIH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1ZJTkVHQVInOiB7XHJcblx0XHRcdFx0bGV0IHZpbmVnYXJUaHJvd24gPSArZXZlbnQuZGF0YS5hbW91bnQ7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciA9IDA7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRcdFx0aWYgKHRhcmdldC55b3UpIHtcclxuXHRcdFx0XHRcdGlmIChldmVudC5kYXRhLnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGF0ZS52aW5lZ2FyZWQgPSB7XHJcblx0XHRcdFx0XHRcdFx0anVzdFZpbmVnYXJlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyZWRCeTogcmFua2VyLFxyXG5cdFx0XHRcdFx0XHRcdHZpbmVnYXJUaHJvd24sXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdC8vIGFsZXJ0KHJhbmtlci51c2VybmFtZSArIFwiIHRocmV3IHRoZWlyIFwiXHJcblx0XHRcdFx0XHRcdC8vICsgbnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh2aW5lZ2FyVGhyb3duKVxyXG5cdFx0XHRcdFx0XHQvLyArIFwiIFZpbmVnYXIgYXQgeW91IGFuZCBtYWRlIHlvdSBzbGlwIHRvIHRoZSBib3R0b20gb2YgdGhlIGxhZGRlci5cIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRhcmdldC52aW5lZ2FyID0gTWF0aC5tYXgoMCwgdGFyZ2V0LnZpbmVnYXIgLSB2aW5lZ2FyVGhyb3duKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdTT0ZUX1JFU0VUX1BPSU5UUyc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1BST01PVEUnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuZ3Jvd2luZyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRpZiAoZXZlbnQuYWNjb3VudElkID09IHRoaXMudXNlckRhdGEuYWNjb3VudElkKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgbmV3TGFkZGVyTnVtID0gbGFkZGVyRGF0YS5jdXJyZW50TGFkZGVyLm51bWJlciArIDFcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUxhZGRlcihuZXdMYWRkZXJOdW0pO1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlQ2hhdFJvb20obmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyYXBlcyAtPSB0aGlzLmdldEF1dG9Qcm9tb3RlR3JhcGVDb3N0KHJhbmtlci5yYW5rKTtcclxuXHRcdFx0XHRyYW5rZXIuYXV0b1Byb21vdGUgPSB0cnVlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0pPSU4nOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IG5ldyBSYW5rZXIoKTtcclxuXHRcdFx0XHRyYW5rZXIuYWNjb3VudElkID0gZXZlbnQuYWNjb3VudElkO1xyXG5cdFx0XHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChldmVudC5kYXRhLnVzZXJuYW1lKTtcclxuXHRcdFx0XHRpZiAocmFua2VyLnVzZXJuYW1lLmluY2x1ZGVzKCdcXFxcdScpKSB7XHJcblx0XHRcdFx0XHR0cnkgeyByYW5rZXIudXNlcm5hbWUgPSBKU09OLnBhcnNlKGBcIiR7cmFua2VyLnVzZXJuYW1lfVwiYCkgfSBjYXRjaCB7IH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmFua2VyLnJhbmsgPSB0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoICsgMTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUucmFua2Vycy5maW5kKGUgPT4gZS5hY2NvdW50SWQgPT0gZXZlbnQuYWNjb3VudElkKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnB1c2gocmFua2VyKTtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbcmFua2VyLmFjY291bnRJZF0gPSByYW5rZXI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ05BTUVfQ0hBTkdFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKGV2ZW50LmRhdGEpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1JFU0VUJzoge1xyXG5cdFx0XHRcdC8vIGRpc2Nvbm5lY3QgaXMgbWFkZSBhdXRvbWF0aWNhbGx5XHJcblx0XHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZUluZm8obWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9pbmZvJ10pIHtcclxuXHRcdHRoaXMuc3RhdGUuaW5mb0RhdGEgPSB7XHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IG1lc3NhZ2UuY29udGVudC5hc3Nob2xlTGFkZGVyLFxyXG5cdFx0XHRhc3Nob2xlVGFnczogbWVzc2FnZS5jb250ZW50LmFzc2hvbGVUYWdzLm1hcCh1bmVzY2FwZUh0bWwpLFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogbWVzc2FnZS5jb250ZW50LmF1dG9Qcm9tb3RlTGFkZGVyLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogK21lc3NhZ2UuY29udGVudC5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSxcclxuXHRcdFx0YmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93OiArbWVzc2FnZS5jb250ZW50LmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyxcclxuXHRcdFx0bWFudWFsUHJvbW90ZVdhaXRUaW1lOiBtZXNzYWdlLmNvbnRlbnQubWFudWFsUHJvbW90ZVdhaXRUaW1lLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogbWVzc2FnZS5jb250ZW50Lm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLFxyXG5cdFx0XHRwb2ludHNGb3JQcm9tb3RlOiArbWVzc2FnZS5jb250ZW50LnBvaW50c0ZvclByb21vdGUsXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVQcml2YXRlTGFkZGVyVXBkYXRlcyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci91cGRhdGVzJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aGFuZGxlTGFkZGVySW5pdChtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci8nXSkge1xyXG5cdFx0aWYgKG1lc3NhZ2Uuc3RhdHVzID09PSBcIk9LXCIpIHtcclxuXHRcdFx0aWYgKG1lc3NhZ2UuY29udGVudCkge1xyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5fbGFkZGVyID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2cobWVzc2FnZSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9IG1lc3NhZ2UuY29udGVudC5jdXJyZW50TGFkZGVyLm51bWJlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnN0YXJ0UmFuayA9IG1lc3NhZ2UuY29udGVudC5zdGFydFJhbms7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzID0gbWVzc2FnZS5jb250ZW50LnJhbmtlcnMubWFwKGUgPT4gUmFua2VyLmZyb20oZSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWQgPSBPYmplY3QuZnJvbUVudHJpZXModGhpcy5zdGF0ZS5yYW5rZXJzLm1hcChlID0+IFtlLmFjY291bnRJZCwgZV0pKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnlvdXJSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW21lc3NhZ2UuY29udGVudC55b3VyUmFua2VyLmFjY291bnRJZF0gYXMgWW91UmFua2VyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQgPSB7XHJcblx0XHRcdFx0XHRjdXJyZW50VGltZTogMCxcclxuXHRcdFx0XHRcdHJhbmtlcnM6IHRoaXMuc3RhdGUucmFua2Vycy5zbGljZSgpLFxyXG5cdFx0XHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdFx0XHRcdHJlYWx0aW1lRW5kOiBwZXJmb3JtYW5jZS5ub3coKSxcclxuXHRcdFx0XHRcdHJlYWx0aW1lU3RhcnQ6IHBlcmZvcm1hbmNlLm5vdygpLFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGVkID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0dGhpcy51c2VyRGF0YS5hY2NvdW50SWQgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkO1xyXG5cdFx0XHRcdHRoaXMudXNlckRhdGEudXNlcm5hbWUgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIudXNlcm5hbWU7XHJcblxyXG5cdFx0XHRcdGFudGQubWVzc2FnZS5zdWNjZXNzKFxyXG5cdFx0XHRcdFx0YENvbm5lY3RlZCB0byBMYWRkZXIjJHttZXNzYWdlLmNvbnRlbnQuY3VycmVudExhZGRlci5udW1iZXJ9ICFgLFxyXG5cdFx0XHRcdFx0MTAsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlTGFkZGVyKHNlY29uZHNQYXNzZWQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy5zdGF0ZS5jdXJyZW50VGltZSArPSBzZWNvbmRzUGFzc2VkO1xyXG5cdFx0bGV0IGN1cnJlbnRUaW1lID0gdGhpcy5zdGF0ZS5jdXJyZW50VGltZTtcclxuXHRcdHRoaXMuc3RhdGUudXBkYXRlU3RhcnRSZWFsdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLmVuc3VyZVNvcnRlZERlc2NlbmRpbmcodGhpcy5zdGF0ZS5yYW5rZXJzLCBlID0+IGUucG9pbnRzKTtcclxuXHJcblx0XHRsZXQgbGFkZGVyU3RhdHMgPSB7XHJcblx0XHRcdGdyb3dpbmdSYW5rZXJDb3VudDogMCxcclxuXHRcdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHRcdFx0ZXRhOiAwXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdHJhbmtlci5yYW5rID0gcmFuaztcclxuXHRcdFx0Ly8gSWYgdGhlIHJhbmtlciBpcyBjdXJyZW50bHkgc3RpbGwgb24gbGFkZGVyXHJcblx0XHRcdGlmICghcmFua2VyLmdyb3dpbmcpIHJldHVybjtcclxuXHRcdFx0bGFkZGVyU3RhdHMuZ3Jvd2luZ1JhbmtlckNvdW50ICs9IDE7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBQb2ludHMgJiBQb3dlclxyXG5cdFx0XHRpZiAocmFuayAhPSAxKSB7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyICs9IE1hdGguZmxvb3IoKHJhbmtlci5iaWFzICsgcmFuayAtIDEpICogcmFua2VyLm11bHRpcGxpZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyYW5rZXIucG9pbnRzICs9IE1hdGguZmxvb3IocmFua2VyLnBvd2VyICogc2Vjb25kc1Bhc3NlZCk7XHJcblxyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRpbmcgVmluZWdhciBiYXNlZCBvbiBHcmFwZXMgY291bnRcclxuXHRcdFx0aWYgKHJhbmsgPT0gMSkge1xyXG5cdFx0XHRcdGlmICh0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyID09PSAxKVxyXG5cdFx0XHRcdFx0cmFua2VyLnZpbmVnYXIgPSBNYXRoLmZsb29yKHJhbmtlci52aW5lZ2FyICogKDAuOTk3NSAqKiBzZWNvbmRzUGFzc2VkKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgKz0gTWF0aC5mbG9vcihyYW5rZXIuZ3JhcGVzICogc2Vjb25kc1Bhc3NlZClcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGV0IHJhbmtlcnNPbGQgPSB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKTtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIucG9pbnRzIC0gYS5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4LCBsaXN0KSA9PiB7XHJcblx0XHRcdGxldCBuZXdSYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRsZXQgb2xkUmFuayA9IHJhbmtlci5yYW5rO1xyXG5cdFx0XHRpZiAobmV3UmFuayA9PSBvbGRSYW5rKSByZXR1cm47XHJcblxyXG5cdFx0XHRyYW5rZXIucmFuayA9IG5ld1Jhbms7XHJcblxyXG5cdFx0XHRpZiAobmV3UmFuayA8IG9sZFJhbmspXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdVUFJBTksnLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rIH0pO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdET1dOUkFOSycsIHsgY3VycmVudFRpbWUsIG9sZFJhbmsgfSk7XHJcblxyXG5cdFx0XHRpZiAobmV3UmFuayA8IG9sZFJhbmspIHtcclxuXHRcdFx0XHQvLyByYW5rIGluY3JlYXNlLCBnYWluIGdyYXBlc1xyXG5cdFx0XHRcdGZvciAobGV0IHIgPSBvbGRSYW5rOyByIDwgbmV3UmFuazsgcisrKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgb3RoZXJSYW5rZXIgPSByYW5rZXJzT2xkW3JdO1xyXG5cdFx0XHRcdFx0aWYgKHJhbmtlci5ncm93aW5nICYmIChyYW5rZXIuYmlhcyA+IDAgfHwgcmFua2VyLm11bHRpcGxpZXIgPiAxKSkge1xyXG5cdFx0XHRcdFx0XHRyYW5rZXIuZ3JhcGVzKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmFua2VyIG9uIExhc3QgUGxhY2UgZ2FpbnMgMSBHcmFwZSwgb25seSBpZiBoZSBpc24ndCB0aGUgb25seSBvbmVcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoID49IE1hdGgubWF4KHRoaXMuc3RhdGUuaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdGxldCBsYXN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzW3RoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggLSAxXTtcclxuXHRcdFx0aWYgKGxhc3RSYW5rZXIuZ3Jvd2luZykge1xyXG5cdFx0XHRcdGxhc3RSYW5rZXIuZ3JhcGVzICs9IH5+c2Vjb25kc1Bhc3NlZDtcclxuXHRcdFx0XHRsYXN0UmFua2VyLnB1c2hIaXN0b3J5KCdMQVNUJywgeyBjdXJyZW50VGltZSwgb2xkUmFuazogMCB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVN0YXRzKCk7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQgPSB7XHJcblx0XHRcdGN1cnJlbnRUaW1lOiB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lLFxyXG5cdFx0XHRyYW5rZXJzOiB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKSxcclxuXHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdFx0cmVhbHRpbWVTdGFydDogcGVyZm9ybWFuY2Uubm93KCksXHJcblx0XHRcdHJlYWx0aW1lRW5kOiBwZXJmb3JtYW5jZS5ub3coKSxcclxuXHRcdH1cclxuXHRcdGZvciAobGV0IHJhbmtlciBvZiB0aGlzLnN0YXRlLnJhbmtlcnMpIHtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihyYW5rZXIuaW50ZXJwb2xhdGVkLCB7XHJcblx0XHRcdFx0aGlzdG9yeTogW10sXHJcblx0XHRcdFx0cG93ZXI6IHJhbmtlci5wb3dlcixcclxuXHRcdFx0XHRwb2ludHM6IHJhbmtlci5wb2ludHMsXHJcblx0XHRcdFx0cmFuazogcmFua2VyLnJhbmssXHJcblx0XHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnN0YXRlLnVwZGF0ZUVuZFJlYWx0aW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0fVxyXG5cclxuXHRlbnN1cmVTb3J0ZWREZXNjZW5kaW5nPFQ+KGFycmF5OiBUW10sIGZuOiAoZWw6IFQpID0+IG51bWJlcikge1xyXG5cdFx0bGV0IHByZXZWYWx1ZSA9ICtJbmZpbml0eTtcclxuXHRcdGxldCBzb3J0ZWQgPSB0cnVlO1xyXG5cdFx0Zm9yIChsZXQgZWwgb2YgYXJyYXkpIHtcclxuXHRcdFx0bGV0IHZhbHVlID0gZm4oZWwpO1xyXG5cdFx0XHRpZiAodmFsdWUgPiBwcmV2VmFsdWUpIHtcclxuXHRcdFx0XHRzb3J0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRwcmV2VmFsdWUgPSB2YWx1ZTtcclxuXHRcdH1cclxuXHRcdGlmICghc29ydGVkKSB7XHJcblx0XHRcdGFycmF5LnNvcnQoKGEsIGIpID0+IGZuKGIpIC0gZm4oYSkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlU3RhdHMoKSB7XHJcblx0XHR0aGlzLnN0YXRlLnBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUgPSB0aGlzLmNhbGN1bGF0ZVBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUoKTtcclxuXHRcdC8vIFx0Ly8gRVRBXHJcblx0XHQvLyBcdC8vIFRPRE86IEVUQVxyXG5cdH1cclxuXHJcblx0aW50ZXJwb2xhdGVMYWRkZXIoc2Vjb25kc09mZnNldDogbnVtYmVyKSB7XHJcblx0XHRsZXQgY3VycmVudFRpbWUgPSB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lICsgc2Vjb25kc09mZnNldDtcclxuXHRcdHRoaXMuc3RhdGUuaW50ZXJwb2xhdGVkLmN1cnJlbnRUaW1lID0gY3VycmVudFRpbWU7XHJcblx0XHR0aGlzLnN0YXRlLmludGVycG9sYXRlZC50aW1lT2Zmc2V0ID0gc2Vjb25kc09mZnNldDtcclxuXHRcdHRoaXMuc3RhdGUuaW50ZXJwb2xhdGVkLnJlYWx0aW1lU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdGxldCBzZWNvbmRzUGFzc2VkID0gc2Vjb25kc09mZnNldDtcclxuXHJcblx0XHR0aGlzLmVuc3VyZVNvcnRlZERlc2NlbmRpbmcodGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQucmFua2VycywgZSA9PiBlLmludGVycG9sYXRlZC5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUuaW50ZXJwb2xhdGVkLnJhbmtlcnMuZm9yRWFjaCgocmFua2VyLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRsZXQgcmFuayA9IGluZGV4ICsgMTtcclxuXHRcdFx0cmFua2VyLmludGVycG9sYXRlZC5yYW5rID0gcmFuaztcclxuXHRcdFx0Ly8gSWYgdGhlIHJhbmtlciBpcyBjdXJyZW50bHkgc3RpbGwgb24gbGFkZGVyXHJcblx0XHRcdGlmICghcmFua2VyLmdyb3dpbmcpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIENhbGN1bGF0aW5nIFBvaW50cyAmIFBvd2VyXHJcblx0XHRcdGlmIChyYW5rICE9IDEpIHtcclxuXHRcdFx0XHRyYW5rZXIuaW50ZXJwb2xhdGVkLnBvd2VyID0gcmFua2VyLnBvd2VyICsgTWF0aC5mbG9vcigocmFua2VyLmJpYXMgKyByYW5rIC0gMSkgKiByYW5rZXIubXVsdGlwbGllciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJhbmtlci5pbnRlcnBvbGF0ZWQucG9pbnRzID0gcmFua2VyLnBvaW50cyArIE1hdGguZmxvb3IocmFua2VyLnBvd2VyICogc2Vjb25kc1Bhc3NlZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsZXQgcmFua2Vyc09sZCA9IHRoaXMuc3RhdGUucmFua2Vycy5zbGljZSgpO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLmludGVycG9sYXRlZC5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIuaW50ZXJwb2xhdGVkLnBvaW50cyAtIGEuaW50ZXJwb2xhdGVkLnBvaW50cyk7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4LCBsaXN0KSA9PiB7XHJcblx0XHRcdGxldCBuZXdSYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRsZXQgb2xkUmFuayA9IHJhbmtlci5pbnRlcnBvbGF0ZWQucmFuaztcclxuXHRcdFx0aWYgKG5ld1JhbmsgPT0gb2xkUmFuaykgcmV0dXJuO1xyXG5cclxuXHRcdFx0cmFua2VyLmludGVycG9sYXRlZC5yYW5rID0gbmV3UmFuaztcclxuXHJcblx0XHRcdGlmIChuZXdSYW5rIDwgb2xkUmFuaylcclxuXHRcdFx0XHRyYW5rZXIucHVzaEhpc3RvcnkoJ1VQUkFOSycsIHsgY3VycmVudFRpbWUsIG9sZFJhbmsgfSwgdHJ1ZSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRyYW5rZXIucHVzaEhpc3RvcnkoJ0RPV05SQU5LJywgeyBjdXJyZW50VGltZSwgb2xkUmFuayB9LCB0cnVlKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQucmVhbHRpbWVFbmQgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHR9XHJcblxyXG5cclxuXHRjYWxjdWxhdGVQb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlKCkge1xyXG5cdFx0bGV0IGluZm9EYXRhID0gdGhpcy5zdGF0ZS5pbmZvRGF0YTtcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoIDwgTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdHJldHVybiBJbmZpbml0eTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLnN0YXRlLmZpcnN0UmFua2VyLnBvaW50cyA8IGluZm9EYXRhLnBvaW50c0ZvclByb21vdGUpIHtcclxuXHRcdFx0cmV0dXJuIGluZm9EYXRhLnBvaW50c0ZvclByb21vdGU7XHJcblx0XHR9XHJcblx0XHRsZXQgZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLmZpcnN0UmFua2VyO1xyXG5cdFx0bGV0IHNlY29uZFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1sxXTtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyIDwgaW5mb0RhdGEuYXV0b1Byb21vdGVMYWRkZXIpIHtcclxuXHRcdFx0aWYgKCFmaXJzdFJhbmtlci55b3UpIHJldHVybiBmaXJzdFJhbmtlci5wb2ludHMgKyAxO1xyXG5cdFx0XHRyZXR1cm4gc2Vjb25kUmFua2VyLnBvaW50cyArIDE7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGxlYWRpbmdSYW5rZXIgPSBmaXJzdFJhbmtlcjtcclxuXHRcdGxldCBwdXJzdWluZ1JhbmtlciA9IGZpcnN0UmFua2VyLnlvdSA/IHNlY29uZFJhbmtlciA6IGZpcnN0UmFua2VyO1xyXG5cclxuXHRcdC8vIEhvdyBtYW55IG1vcmUgcG9pbnRzIGRvZXMgdGhlIHJhbmtlciBnYWluIGFnYWluc3QgaGlzIHB1cnN1ZXIsIGV2ZXJ5IFNlY29uZFxyXG5cdFx0bGV0IHBvd2VyRGlmZiA9IChsZWFkaW5nUmFua2VyLmdyb3dpbmcgPyBwdXJzdWluZ1Jhbmtlci5wb3dlciA6IDApIC0gKHB1cnN1aW5nUmFua2VyLmdyb3dpbmcgPyBwdXJzdWluZ1Jhbmtlci5wb3dlciA6IDApO1xyXG5cdFx0Ly8gQ2FsY3VsYXRlIHRoZSBuZWVkZWQgUG9pbnQgZGlmZmVyZW5jZSwgdG8gaGF2ZSBmLmUuIDMwc2Vjb25kcyBvZiBwb2ludCBnZW5lcmF0aW9uIHdpdGggdGhlIGRpZmZlcmVuY2UgaW4gcG93ZXJcclxuXHRcdGxldCBuZWVkZWRQb2ludERpZmYgPSBNYXRoLmFicyhwb3dlckRpZmYgKiBpbmZvRGF0YS5tYW51YWxQcm9tb3RlV2FpdFRpbWUpO1xyXG5cclxuXHRcdHJldHVybiBNYXRoLm1heChcclxuXHRcdFx0KGxlYWRpbmdSYW5rZXIueW91ID8gcHVyc3VpbmdSYW5rZXIgOiBsZWFkaW5nUmFua2VyKS5wb2ludHMgKyBuZWVkZWRQb2ludERpZmYsXHJcblx0XHRcdGluZm9EYXRhLnBvaW50c0ZvclByb21vdGVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHJcblx0cmVxdWVzdCh0eXBlOiAnYXNzaG9sZScgfCAnYXV0by1wcm9tb3RlJyB8ICdiaWFzJyB8ICdtdWx0aScgfCAncHJvbW90ZScgfCAndmluZWdhcicpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMuY2FuUmVxdWVzdCh0eXBlLCB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgZmFrZVJlcXVlc3Q6ICVPIGNhbid0IGRvICVPIWAsIFZ1ZS50b1Jhdyh0aGlzLnN0YXRlLnlvdXJSYW5rZXIpLCB0eXBlKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZChgL2FwcC9sYWRkZXIvcG9zdC8ke3R5cGV9YCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblx0fVxyXG5cclxuXHRmYWtlVXBkYXRlKHNlY29uZHNQYXNzZWQ6IG51bWJlciA9IDEpIHtcclxuXHRcdHRoaXMuY2FsY3VsYXRlTGFkZGVyKHNlY29uZHNQYXNzZWQpO1xyXG5cdH1cclxuXHRmYWtlUmVxdWVzdChldmVudFR5cGU6IFNvY2tldExhZGRlckV2ZW50WydldmVudFR5cGUnXSwgYWNjb3VudElkOiBhY2NvdW50SWQgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkKSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuUmVxdWVzdChldmVudFR5cGUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9fL2csICctJykgYXMgYW55LCBhY2NvdW50SWQpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBmYWtlUmVxdWVzdDogJU8gY2FuJ3QgZG8gJU8hYCwgVnVlLnRvUmF3KHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXSksIGV2ZW50VHlwZSk7XHJcblx0XHR9XHJcblx0XHRzd2l0Y2ggKGV2ZW50VHlwZSkge1xyXG5cdFx0XHRjYXNlICdCSUFTJzpcclxuXHRcdFx0Y2FzZSAnTVVMVEknOlxyXG5cdFx0XHRjYXNlICdTT0ZUX1JFU0VUX1BPSU5UUyc6XHJcblx0XHRcdGNhc2UgJ1BST01PVEUnOlxyXG5cdFx0XHRjYXNlICdBVVRPX1BST01PVEUnOlxyXG5cdFx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoeyBldmVudFR5cGUsIGFjY291bnRJZCB9KTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgJ1ZJTkVHQVInOiB7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHRcdFx0XHRsZXQgc291cmNlID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFthY2NvdW50SWRdO1xyXG5cdFx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoe1xyXG5cdFx0XHRcdFx0ZXZlbnRUeXBlLCBhY2NvdW50SWQsIGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0YW1vdW50OiBzb3VyY2UudmluZWdhciArICcnLFxyXG5cdFx0XHRcdFx0XHRzdWNjZXNzOiBzb3VyY2UudmluZWdhciA+IHRhcmdldC52aW5lZ2FyLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pOyBicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdGV2ZW50VHlwZTtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdub3QgaW1wbGVtZW50ZWQnLCB7IGZha2VSZXF1ZXN0OiB0cnVlLCBldmVudFR5cGUsIGFjY291bnRJZCB9KTtcclxuXHRcdFx0XHRhbGVydCgnbm90IGltcGxlbWVudGVkJyk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcigwKTtcclxuXHR9XHJcblxyXG5cclxuXHJcblx0Z2V0VXBncmFkZUNvc3QobGV2ZWw6IG51bWJlcikge1xyXG5cdFx0cmV0dXJuIE1hdGgucm91bmQoTWF0aC5wb3codGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciArIDEsIGxldmVsKSk7XHJcblx0fVxyXG5cclxuXHRnZXRWaW5lZ2FyVGhyb3dDb3N0KCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuc3RhdGUuaW5mb0RhdGEuYmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93ICogdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcjtcclxuXHR9XHJcblxyXG5cdGdldEF1dG9Qcm9tb3RlR3JhcGVDb3N0KHJhbms6IG51bWJlcikge1xyXG5cdFx0bGV0IGluZm9EYXRhID0gdGhpcy5zdGF0ZS5pbmZvRGF0YTtcclxuXHRcdGxldCBtaW5QZW9wbGUgPSBNYXRoLm1heChpbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcik7XHJcblx0XHRsZXQgZGl2aXNvciA9IE1hdGgubWF4KHJhbmsgLSBtaW5QZW9wbGUgKyAxLCAxKTtcclxuXHRcdHJldHVybiBNYXRoLmZsb29yKGluZm9EYXRhLmJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlIC8gZGl2aXNvcik7XHJcblx0fVxyXG5cclxuXHRnZXRCaWFzQ29zdChyYW5rZXI6IFJhbmtlciA9IHRoaXMuc3RhdGUueW91clJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VXBncmFkZUNvc3QocmFua2VyLmJpYXMgKyAxKTtcclxuXHR9XHJcblx0Z2V0TXVsdGlwbGllckNvc3QocmFua2VyOiBSYW5rZXIgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFVwZ3JhZGVDb3N0KHJhbmtlci5tdWx0aXBsaWVyICsgMSk7XHJcblx0fVxyXG5cclxuXHRjYW5SZXF1ZXN0KHR5cGU6ICdhc3Nob2xlJyB8ICdhdXRvLXByb21vdGUnIHwgJ2JpYXMnIHwgJ211bHRpJyB8ICdwcm9tb3RlJyB8ICd2aW5lZ2FyJywgYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZCkge1xyXG5cdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXTtcclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlICdiaWFzJzoge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldEJpYXNDb3N0KHJhbmtlcikgPD0gcmFua2VyLnBvaW50cztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdtdWx0aSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRNdWx0aXBsaWVyQ29zdChyYW5rZXIpIDw9IHJhbmtlci5wb3dlcjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICd2aW5lZ2FyJzoge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFZpbmVnYXJUaHJvd0Nvc3QoKSA8PSByYW5rZXIudmluZWdhcjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdwcm9tb3RlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdhdXRvLXByb21vdGUnOiB7XHJcblx0XHRcdFx0cmV0dXJuICEhJ1RPRE8nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ2Fzc2hvbGUnOiB7XHJcblx0XHRcdFx0cmV0dXJuICEhJ1RPRE8nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbiJdfQ==