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
        ranker.interpolated = {
            history: [],
            points: ranker.points,
            power: ranker.power,
            rank: ranker.rank,
            timeOffset: 0,
        };
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
        ladderNum: 1,
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
        },
        pointsNeededForManualPromote: 0,
        currentTime: 0,
        updateRealTime: 0,
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
        this.ladderSubscription = this.socket.subscribe('/topic/ladder/$ladderNum', (data) => {
            this.handleLadderUpdates(data);
        }, { uuid: this.userData.uuid }, this.state.ladderNum);
        this.socket.subscribe('/user/queue/ladder/', (data) => {
            this.handleLadderInit(data);
        }, { uuid: this.userData.uuid });
        this.socket.subscribe('/user/queue/ladder/updates', (data) => {
            this.handlePrivateLadderUpdates(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/ladder/init/$ladderNum', { uuid: this.userData.uuid }, this.state.ladderNum);
        this.socket.subscribe('/user/queue/info', (data) => {
            this.handleInfo(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/info', { uuid: this.userData.uuid });
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
                };
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.userData.accountId = this.state.yourRanker.accountId;
                this.userData.username = this.state.yourRanker.username;
            }
        }
    }
    calculateLadder(secondsPassed) {
        this.state.currentTime += secondsPassed;
        let currentTime = this.state.currentTime;
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
        };
        for (let ranker of this.state.rankers) {
            ranker.interpolated = {
                history: [],
                power: ranker.power,
                points: ranker.points,
                rank: ranker.rank,
                timeOffset: 0,
            };
        }
        this.state.updateRealTime = performance.now();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBZ0JELE1BQU0sTUFBTTtJQUNYLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsUUFBUSxHQUFXLEVBQUUsQ0FBQztJQUN0QixNQUFNLEdBQVcsQ0FBQyxDQUFDO0lBQ25CLEtBQUssR0FBVyxDQUFDLENBQUM7SUFDbEIsSUFBSSxHQUFXLENBQUMsQ0FBQztJQUNqQixVQUFVLEdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLEdBQUcsR0FBWSxLQUFLLENBQUM7SUFDckIsT0FBTyxHQUFZLElBQUksQ0FBQztJQUN4QixZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsT0FBTyxHQUFXLENBQUMsQ0FBQztJQUVwQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFdBQVcsR0FBWSxLQUFLLENBQUM7SUFFN0IsT0FBTyxHQUF5RCxFQUFFLENBQUM7SUFFbkUsWUFBWSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDM0IsVUFBVSxFQUFFLENBQUM7UUFDYixJQUFJLEVBQUUsQ0FBQztRQUNQLE1BQU0sRUFBRSxDQUFDO1FBQ1QsS0FBSyxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsRUFBMEQ7S0FDbkUsQ0FBQyxDQUFDO0lBRUg7UUFDQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUlELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBc0M7UUFDakQsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxN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TyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUEyRSxFQUFFLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTO1FBQ2xJLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsSUFBSSxFQUFFO1lBQ2IsS0FBSyxNQUFNLENBQUMsQ0FBQztnQkFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqRDtZQUNELEtBQUssT0FBTyxDQUFDLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQzthQUN0RDtZQUNELEtBQUssU0FBUyxDQUFDLENBQUM7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDO2FBQ3BEO1lBQ0QsS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7YUFDaEI7WUFDRCxLQUFLLGNBQWMsQ0FBQyxDQUFDO2dCQUNwQixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7YUFDaEI7WUFDRCxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQzthQUNoQjtZQUNEO2dCQUNDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDRixDQUFDO0NBRUQiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcblxyXG5jbGFzcyBQbGF5ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5yZWFjdGl2ZSh0aGlzKTtcclxuXHR9XHJcbn1cclxuXHJcbnR5cGUgX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8VCBleHRlbmRzIHN0cmluZywgRCBleHRlbmRzIHt9ID0ge30+ID0ge1xyXG5cdHR5cGU6IFQsIGRlbHRhOiBudW1iZXIsIHJhbms6IG51bWJlciwgb2xkUmFuazogbnVtYmVyLCBjdXJyZW50VGltZTogbnVtYmVyLFxyXG59ICYgRDtcclxuXHJcbnR5cGUgUmFua2VySGlzdG9yeUV2ZW50TWFwID0ge1xyXG5cdCdVUFJBTksnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnVVBSQU5LJz4sXHJcblx0J0RPV05SQU5LJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0RPV05SQU5LJz4sXHJcblx0J01VTFRJJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J01VTFRJJz4sXHJcblx0J0JJQVMnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnQklBUyc+LFxyXG5cdCdMQVNUJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0xBU1QnPixcclxuXHQnVEhST1dfVklORUdBUic6IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PCdUSFJPV19WSU5FR0FSJywgeyB0YXJnZXQ6IGFjY291bnRJZCwgYW1vdW50OiBudW1iZXIsIHN1Y2Nlc3M6IGJvb2xlYW4gfT4sXHJcblx0J0dPVF9WSU5FR0FSRUQnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnR09UX1ZJTkVHQVJFRCcsIHsgc291cmNlOiBhY2NvdW50SWQsIGFtb3VudDogbnVtYmVyLCBzdWNjZXNzOiBib29sZWFuIH0+LFxyXG59O1xyXG5cclxuY2xhc3MgUmFua2VyIHtcclxuXHRhY2NvdW50SWQ6IGFjY291bnRJZCA9IDA7XHJcblx0dXNlcm5hbWU6IHN0cmluZyA9ICcnO1xyXG5cdHBvaW50czogbnVtYmVyID0gMDtcclxuXHRwb3dlcjogbnVtYmVyID0gMTtcclxuXHRiaWFzOiBudW1iZXIgPSAwO1xyXG5cdG11bHRpcGxpZXI6IG51bWJlciA9IDE7XHJcblx0eW91OiBib29sZWFuID0gZmFsc2U7XHJcblx0Z3Jvd2luZzogYm9vbGVhbiA9IHRydWU7XHJcblx0dGltZXNBc3Nob2xlOiBudW1iZXIgPSAwO1xyXG5cdGdyYXBlczogbnVtYmVyID0gMDtcclxuXHR2aW5lZ2FyOiBudW1iZXIgPSAwO1xyXG5cclxuXHRyYW5rOiBudW1iZXIgPSAwO1xyXG5cdGF1dG9Qcm9tb3RlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGhpc3Rvcnk6IFJhbmtlckhpc3RvcnlFdmVudE1hcFtrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBdW10gPSBbXTtcclxuXHJcblx0aW50ZXJwb2xhdGVkID0gVnVlLnJlYWN0aXZlKHtcclxuXHRcdHRpbWVPZmZzZXQ6IDAsXHJcblx0XHRyYW5rOiAwLFxyXG5cdFx0cG9pbnRzOiAwLFxyXG5cdFx0cG93ZXI6IDAsXHJcblx0XHRoaXN0b3J5OiBbXSBhcyBSYW5rZXJIaXN0b3J5RXZlbnRNYXBba2V5b2YgUmFua2VySGlzdG9yeUV2ZW50TWFwXVtdLFxyXG5cdH0pO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHJldHVybiBWdWUubWFya1Jhdyh0aGlzKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0WW91UmFua2VyKTogWW91UmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyKTogUmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyIHwgU29ja2V0WW91UmFua2VyKTogUmFua2VyIHwgWW91UmFua2VyIHtcclxuXHRcdGxldCByYW5rZXIgPSBzb3VyY2UueW91ID8gbmV3IFlvdVJhbmtlcigpIDogbmV3IFJhbmtlcigpO1xyXG5cdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKHNvdXJjZS51c2VybmFtZSk7XHJcblx0XHRyYW5rZXIueW91ID0gc291cmNlLnlvdTtcclxuXHRcdHJhbmtlci5hY2NvdW50SWQgPSBzb3VyY2UuYWNjb3VudElkO1xyXG5cdFx0cmFua2VyLmJpYXMgPSBzb3VyY2UuYmlhcztcclxuXHRcdHJhbmtlci5ncm93aW5nID0gc291cmNlLmdyb3dpbmc7XHJcblx0XHRyYW5rZXIubXVsdGlwbGllciA9IHNvdXJjZS5tdWx0aXBsaWVyO1xyXG5cdFx0cmFua2VyLnJhbmsgPSBzb3VyY2UucmFuaztcclxuXHRcdHJhbmtlci50aW1lc0Fzc2hvbGUgPSBzb3VyY2UudGltZXNBc3Nob2xlO1xyXG5cdFx0cmFua2VyLnBvaW50cyA9ICtzb3VyY2UucG9pbnRzO1xyXG5cdFx0cmFua2VyLnBvd2VyID0gK3NvdXJjZS5wb3dlcjtcclxuXHRcdHJhbmtlci5pbnRlcnBvbGF0ZWQgPSB7XHJcblx0XHRcdGhpc3Rvcnk6IFtdLFxyXG5cdFx0XHRwb2ludHM6IHJhbmtlci5wb2ludHMsXHJcblx0XHRcdHBvd2VyOiByYW5rZXIucG93ZXIsXHJcblx0XHRcdHJhbms6IHJhbmtlci5yYW5rLFxyXG5cdFx0XHR0aW1lT2Zmc2V0OiAwLFxyXG5cdFx0fVxyXG5cdFx0aWYgKHNvdXJjZS55b3UpIHtcclxuXHRcdFx0bGV0IHlvdVNvdXJjZSA9IHNvdXJjZSBhcyBTb2NrZXRZb3VSYW5rZXI7XHJcblx0XHRcdGxldCB5b3VSYW5rZXIgPSByYW5rZXIgYXMgWW91UmFua2VyO1xyXG5cdFx0XHR5b3VSYW5rZXIuYXV0b1Byb21vdGUgPSB5b3VTb3VyY2UuYXV0b1Byb21vdGU7XHJcblx0XHRcdHlvdVJhbmtlci5ncmFwZXMgPSAreW91U291cmNlLmdyYXBlcztcclxuXHRcdFx0eW91UmFua2VyLnZpbmVnYXIgPSAreW91U291cmNlLnZpbmVnYXI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmFua2VyO1xyXG5cdH1cclxuXHJcblx0Z2V0IHBvd2VyRm9ybWF0dGVkKCkge1xyXG5cdFx0cmV0dXJuIGAke251bWJlckZvcm1hdHRlci5mb3JtYXQodGhpcy5pbnRlcnBvbGF0ZWQucG93ZXIpXHJcblx0XHRcdH0gWyskeyh0aGlzLmJpYXMgKyAnJykucGFkU3RhcnQoMiwgJzAnKVxyXG5cdFx0XHR9IHgkeyh0aGlzLm11bHRpcGxpZXIgKyAnJykucGFkU3RhcnQoMiwgJzAnKVxyXG5cdFx0XHR9XWA7XHJcblx0fVxyXG5cdGdldCBwb2ludHNGb3JtYXR0ZWQoKSB7XHJcblx0XHRyZXR1cm4gbnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh0aGlzLmludGVycG9sYXRlZC5wb2ludHMpO1xyXG5cdH1cclxuXHJcblx0cHVzaEhpc3Rvcnk8VCBleHRlbmRzIGtleW9mIFJhbmtlckhpc3RvcnlFdmVudE1hcD4oXHJcblx0XHR0eXBlOiBULCBkYXRhOiBPbWl0PFJhbmtlckhpc3RvcnlFdmVudE1hcFtUXSwgJ3R5cGUnIHwgJ2RlbHRhJyB8ICdyYW5rJz4sXHJcblx0XHRpbnRlcnBvbGF0ZWQgPSBmYWxzZSxcclxuXHQpIHtcclxuXHRcdGxldCBjdXJyZW50UmFuayA9ICFpbnRlcnBvbGF0ZWQgPyB0aGlzLnJhbmsgOiB0aGlzLmludGVycG9sYXRlZC5yYW5rO1xyXG5cdFx0aWYgKGRhdGEub2xkUmFuayA9PSAwKSBkYXRhLm9sZFJhbmsgPSBjdXJyZW50UmFuaztcclxuXHRcdGxldCBoaXN0b3J5ID0gIWludGVycG9sYXRlZCA/IHRoaXMuaGlzdG9yeSA6IHRoaXMuaW50ZXJwb2xhdGVkLmhpc3Rvcnk7XHJcblxyXG5cdFx0bGV0IGVudHJ5OiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBba2V5b2YgUmFua2VySGlzdG9yeUV2ZW50TWFwXSB8IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PHN0cmluZz4gPSB7XHJcblx0XHRcdHR5cGUsXHJcblx0XHRcdGRlbHRhOiBjdXJyZW50UmFuayAtIGRhdGEub2xkUmFuayxcclxuXHRcdFx0cmFuazogY3VycmVudFJhbmssXHJcblx0XHRcdC4uLmRhdGEsXHJcblx0XHR9O1xyXG5cdFx0Ly8gT2JqZWN0LmZyZWV6ZShlbnRyeSk7XHJcblx0XHRoaXN0b3J5LnVuc2hpZnQoZW50cnkgYXMgUmFua2VySGlzdG9yeUV2ZW50TWFwW2tleW9mIFJhbmtlckhpc3RvcnlFdmVudE1hcF0pO1xyXG5cdFx0aWYgKGhpc3RvcnkubGVuZ3RoID4gMzApIGhpc3RvcnkucG9wKCk7XHJcblx0XHRyZXR1cm4gZW50cnkgYXMgUmFua2VySGlzdG9yeUV2ZW50TWFwW1RdO1xyXG5cdH1cclxufVxyXG5jbGFzcyBZb3VSYW5rZXIgZXh0ZW5kcyBSYW5rZXIge1xyXG5cdHlvdSA9IHRydWU7XHJcbn1cclxuXHJcblxyXG5jbGFzcyBGYWlyTGFkZGVyIHtcclxuXHRzb2NrZXQ/OiBGYWlyU29ja2V0O1xyXG5cdHVzZXJEYXRhID0gbmV3IFVzZXJEYXRhKCk7XHJcblx0c3RhdGUgPSBWdWVSZWFjdGl2ZSh7XHJcblx0XHRjb25uZWN0ZWQ6IGZhbHNlLFxyXG5cdFx0Y29ubmVjdGlvblJlcXVlc3RlZDogZmFsc2UsXHJcblx0XHRyYW5rZXJzQnlJZDoge30gYXMgUmVjb3JkPGFjY291bnRJZCwgUmFua2VyPixcclxuXHRcdGxhZGRlck51bTogMSxcclxuXHJcblx0XHR2aW5lZ2FyZWQ6IHtcclxuXHRcdFx0anVzdFZpbmVnYXJlZDogZmFsc2UsXHJcblx0XHRcdHZpbmVnYXJlZEJ5OiBuZXcgUmFua2VyKCksXHJcblx0XHRcdHZpbmVnYXJUaHJvd246IDAsXHJcblx0XHR9LFxyXG5cclxuXHRcdGN1cnJlbnRMYWRkZXI6IHtcclxuXHRcdFx0bnVtYmVyOiAwLFxyXG5cdFx0fSxcclxuXHRcdHlvdXJSYW5rZXI6IG5ldyBZb3VSYW5rZXIoKSxcclxuXHRcdGZpcnN0UmFua2VyOiBuZXcgUmFua2VyKCksXHJcblx0XHRyYW5rZXJzOiBbbmV3IFJhbmtlcigpXSxcclxuXHRcdHN0YXJ0UmFuazogMCxcclxuXHJcblx0XHRpbmZvRGF0YToge1xyXG5cdFx0XHRwb2ludHNGb3JQcm9tb3RlOiAyNTAwMDAwMDAsXHJcblx0XHRcdG1pbmltdW1QZW9wbGVGb3JQcm9tb3RlOiAxMCxcclxuXHRcdFx0YXNzaG9sZUxhZGRlcjogMTUsXHJcblx0XHRcdGFzc2hvbGVUYWdzOiBbXCJcIiwgXCLimaBcIiwgXCLimaNcIiwgXCLimaVcIiwgXCLimaZcIl0sXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogMTAwMDAwMCxcclxuXHRcdFx0YmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGU6IDIwMDAsXHJcblx0XHRcdG1hbnVhbFByb21vdGVXYWl0VGltZTogMTUsXHJcblx0XHRcdGF1dG9Qcm9tb3RlTGFkZGVyOiAyXHJcblx0XHR9LFxyXG5cclxuXHRcdGludGVycG9sYXRlZDoge1xyXG5cdFx0XHRjdXJyZW50VGltZTogMCxcclxuXHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdFx0cmFua2VyczogW25ldyBSYW5rZXIoKV0sXHJcblx0XHR9LFxyXG5cclxuXHRcdHBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGU6IDAsXHJcblxyXG5cdFx0Y3VycmVudFRpbWU6IDAsXHJcblx0XHR1cGRhdGVSZWFsVGltZTogMCxcclxuXHR9KTtcclxuXHRsYWRkZXJTdWJzY3JpcHRpb246IGFueTtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHJldHVybiBWdWUubWFya1Jhdyh0aGlzKTtcclxuXHR9XHJcblx0Y29ubmVjdCgpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMudXNlckRhdGEudXVpZCkgdGhyb3cgMDtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmNvbm5lY3RlZCB8fCB0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblxyXG5cdFx0dGhpcy5sYWRkZXJTdWJzY3JpcHRpb24gPSB0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy90b3BpYy9sYWRkZXIvJGxhZGRlck51bScsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlTGFkZGVyVXBkYXRlcyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMuc3RhdGUubGFkZGVyTnVtKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2xhZGRlci8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUxhZGRlckluaXQoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2xhZGRlci91cGRhdGVzJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVQcml2YXRlTGFkZGVyVXBkYXRlcyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvbGFkZGVyL2luaXQvJGxhZGRlck51bSdcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnN0YXRlLmxhZGRlck51bSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9pbmZvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVJbmZvKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9pbmZvJ1xyXG5cdFx0XHQsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pXHJcblxyXG5cdH1cclxuXHRkaXNjb25uZWN0KCkge1xyXG5cdFx0Ly8gdG9kb1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUxhZGRlclVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihtZXNzYWdlLnNlY29uZHNQYXNzZWQpO1xyXG5cdH1cclxuXHJcblx0aGFuZGxlRXZlbnQoZXZlbnQ6IFNvY2tldExhZGRlckV2ZW50KSB7XHJcblx0XHRjb25zb2xlLmxvZyhldmVudCk7XHJcblx0XHRsZXQgY3VycmVudFRpbWUgPSB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cclxuXHRcdHN3aXRjaCAoZXZlbnQuZXZlbnRUeXBlKSB7XHJcblx0XHRcdGNhc2UgJ0JJQVMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuYmlhcysrO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnQklBUycsIHsgY3VycmVudFRpbWUsIG9sZFJhbms6IDAgfSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnTVVMVEknOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIubXVsdGlwbGllcisrO1xyXG5cdFx0XHRcdHJhbmtlci5iaWFzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG93ZXIgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnTVVMVEknLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rOiAwIH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1ZJTkVHQVInOiB7XHJcblx0XHRcdFx0bGV0IHZpbmVnYXJUaHJvd24gPSArZXZlbnQuZGF0YS5hbW91bnQ7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciA9IDA7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRcdFx0aWYgKHRhcmdldC55b3UpIHtcclxuXHRcdFx0XHRcdGlmIChldmVudC5kYXRhLnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGF0ZS52aW5lZ2FyZWQgPSB7XHJcblx0XHRcdFx0XHRcdFx0anVzdFZpbmVnYXJlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyZWRCeTogcmFua2VyLFxyXG5cdFx0XHRcdFx0XHRcdHZpbmVnYXJUaHJvd24sXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdC8vIGFsZXJ0KHJhbmtlci51c2VybmFtZSArIFwiIHRocmV3IHRoZWlyIFwiXHJcblx0XHRcdFx0XHRcdC8vICsgbnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh2aW5lZ2FyVGhyb3duKVxyXG5cdFx0XHRcdFx0XHQvLyArIFwiIFZpbmVnYXIgYXQgeW91IGFuZCBtYWRlIHlvdSBzbGlwIHRvIHRoZSBib3R0b20gb2YgdGhlIGxhZGRlci5cIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRhcmdldC52aW5lZ2FyID0gTWF0aC5tYXgoMCwgdGFyZ2V0LnZpbmVnYXIgLSB2aW5lZ2FyVGhyb3duKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdTT0ZUX1JFU0VUX1BPSU5UUyc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1BST01PVEUnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuZ3Jvd2luZyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRpZiAoZXZlbnQuYWNjb3VudElkID09IHRoaXMudXNlckRhdGEuYWNjb3VudElkKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgbmV3TGFkZGVyTnVtID0gbGFkZGVyRGF0YS5jdXJyZW50TGFkZGVyLm51bWJlciArIDFcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUxhZGRlcihuZXdMYWRkZXJOdW0pO1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlQ2hhdFJvb20obmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyYXBlcyAtPSB0aGlzLmdldEF1dG9Qcm9tb3RlR3JhcGVDb3N0KHJhbmtlci5yYW5rKTtcclxuXHRcdFx0XHRyYW5rZXIuYXV0b1Byb21vdGUgPSB0cnVlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0pPSU4nOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IG5ldyBSYW5rZXIoKTtcclxuXHRcdFx0XHRyYW5rZXIuYWNjb3VudElkID0gZXZlbnQuYWNjb3VudElkO1xyXG5cdFx0XHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChldmVudC5kYXRhLnVzZXJuYW1lKTtcclxuXHRcdFx0XHRpZiAocmFua2VyLnVzZXJuYW1lLmluY2x1ZGVzKCdcXFxcdScpKSB7XHJcblx0XHRcdFx0XHR0cnkgeyByYW5rZXIudXNlcm5hbWUgPSBKU09OLnBhcnNlKGBcIiR7cmFua2VyLnVzZXJuYW1lfVwiYCkgfSBjYXRjaCB7IH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmFua2VyLnJhbmsgPSB0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoICsgMTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUucmFua2Vycy5maW5kKGUgPT4gZS5hY2NvdW50SWQgPT0gZXZlbnQuYWNjb3VudElkKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnB1c2gocmFua2VyKTtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbcmFua2VyLmFjY291bnRJZF0gPSByYW5rZXI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ05BTUVfQ0hBTkdFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKGV2ZW50LmRhdGEpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1JFU0VUJzoge1xyXG5cdFx0XHRcdC8vIGRpc2Nvbm5lY3QgaXMgbWFkZSBhdXRvbWF0aWNhbGx5XHJcblx0XHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZUluZm8obWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9pbmZvJ10pIHtcclxuXHRcdHRoaXMuc3RhdGUuaW5mb0RhdGEgPSB7XHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IG1lc3NhZ2UuY29udGVudC5hc3Nob2xlTGFkZGVyLFxyXG5cdFx0XHRhc3Nob2xlVGFnczogbWVzc2FnZS5jb250ZW50LmFzc2hvbGVUYWdzLm1hcCh1bmVzY2FwZUh0bWwpLFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogbWVzc2FnZS5jb250ZW50LmF1dG9Qcm9tb3RlTGFkZGVyLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogK21lc3NhZ2UuY29udGVudC5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSxcclxuXHRcdFx0YmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93OiArbWVzc2FnZS5jb250ZW50LmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyxcclxuXHRcdFx0bWFudWFsUHJvbW90ZVdhaXRUaW1lOiBtZXNzYWdlLmNvbnRlbnQubWFudWFsUHJvbW90ZVdhaXRUaW1lLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogbWVzc2FnZS5jb250ZW50Lm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLFxyXG5cdFx0XHRwb2ludHNGb3JQcm9tb3RlOiArbWVzc2FnZS5jb250ZW50LnBvaW50c0ZvclByb21vdGUsXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVQcml2YXRlTGFkZGVyVXBkYXRlcyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci91cGRhdGVzJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aGFuZGxlTGFkZGVySW5pdChtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci8nXSkge1xyXG5cdFx0aWYgKG1lc3NhZ2Uuc3RhdHVzID09PSBcIk9LXCIpIHtcclxuXHRcdFx0aWYgKG1lc3NhZ2UuY29udGVudCkge1xyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5fbGFkZGVyID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2cobWVzc2FnZSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9IG1lc3NhZ2UuY29udGVudC5jdXJyZW50TGFkZGVyLm51bWJlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnN0YXJ0UmFuayA9IG1lc3NhZ2UuY29udGVudC5zdGFydFJhbms7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzID0gbWVzc2FnZS5jb250ZW50LnJhbmtlcnMubWFwKGUgPT4gUmFua2VyLmZyb20oZSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWQgPSBPYmplY3QuZnJvbUVudHJpZXModGhpcy5zdGF0ZS5yYW5rZXJzLm1hcChlID0+IFtlLmFjY291bnRJZCwgZV0pKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnlvdXJSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW21lc3NhZ2UuY29udGVudC55b3VyUmFua2VyLmFjY291bnRJZF0gYXMgWW91UmFua2VyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQgPSB7XHJcblx0XHRcdFx0XHRjdXJyZW50VGltZTogMCxcclxuXHRcdFx0XHRcdHJhbmtlcnM6IHRoaXMuc3RhdGUucmFua2Vycy5zbGljZSgpLFxyXG5cdFx0XHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3RlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdHRoaXMudXNlckRhdGEuYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZDtcclxuXHRcdFx0XHR0aGlzLnVzZXJEYXRhLnVzZXJuYW1lID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLnVzZXJuYW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVMYWRkZXIoc2Vjb25kc1Bhc3NlZDogbnVtYmVyKSB7XHJcblx0XHR0aGlzLnN0YXRlLmN1cnJlbnRUaW1lICs9IHNlY29uZHNQYXNzZWQ7XHJcblx0XHRsZXQgY3VycmVudFRpbWUgPSB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLmVuc3VyZVNvcnRlZERlc2NlbmRpbmcodGhpcy5zdGF0ZS5yYW5rZXJzLCBlID0+IGUucG9pbnRzKTtcclxuXHJcblx0XHRsZXQgbGFkZGVyU3RhdHMgPSB7XHJcblx0XHRcdGdyb3dpbmdSYW5rZXJDb3VudDogMCxcclxuXHRcdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHRcdFx0ZXRhOiAwXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdHJhbmtlci5yYW5rID0gcmFuaztcclxuXHRcdFx0Ly8gSWYgdGhlIHJhbmtlciBpcyBjdXJyZW50bHkgc3RpbGwgb24gbGFkZGVyXHJcblx0XHRcdGlmICghcmFua2VyLmdyb3dpbmcpIHJldHVybjtcclxuXHRcdFx0bGFkZGVyU3RhdHMuZ3Jvd2luZ1JhbmtlckNvdW50ICs9IDE7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBQb2ludHMgJiBQb3dlclxyXG5cdFx0XHRpZiAocmFuayAhPSAxKSB7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyICs9IE1hdGguZmxvb3IoKHJhbmtlci5iaWFzICsgcmFuayAtIDEpICogcmFua2VyLm11bHRpcGxpZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyYW5rZXIucG9pbnRzICs9IE1hdGguZmxvb3IocmFua2VyLnBvd2VyICogc2Vjb25kc1Bhc3NlZCk7XHJcblxyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRpbmcgVmluZWdhciBiYXNlZCBvbiBHcmFwZXMgY291bnRcclxuXHRcdFx0aWYgKHJhbmsgPT0gMSkge1xyXG5cdFx0XHRcdGlmICh0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyID09PSAxKVxyXG5cdFx0XHRcdFx0cmFua2VyLnZpbmVnYXIgPSBNYXRoLmZsb29yKHJhbmtlci52aW5lZ2FyICogKDAuOTk3NSAqKiBzZWNvbmRzUGFzc2VkKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgKz0gTWF0aC5mbG9vcihyYW5rZXIuZ3JhcGVzICogc2Vjb25kc1Bhc3NlZClcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGV0IHJhbmtlcnNPbGQgPSB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKTtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIucG9pbnRzIC0gYS5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4LCBsaXN0KSA9PiB7XHJcblx0XHRcdGxldCBuZXdSYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRsZXQgb2xkUmFuayA9IHJhbmtlci5yYW5rO1xyXG5cdFx0XHRpZiAobmV3UmFuayA9PSBvbGRSYW5rKSByZXR1cm47XHJcblxyXG5cdFx0XHRyYW5rZXIucmFuayA9IG5ld1Jhbms7XHJcblxyXG5cdFx0XHRpZiAobmV3UmFuayA8IG9sZFJhbmspXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdVUFJBTksnLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rIH0pO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdET1dOUkFOSycsIHsgY3VycmVudFRpbWUsIG9sZFJhbmsgfSk7XHJcblxyXG5cdFx0XHRpZiAobmV3UmFuayA8IG9sZFJhbmspIHtcclxuXHRcdFx0XHQvLyByYW5rIGluY3JlYXNlLCBnYWluIGdyYXBlc1xyXG5cdFx0XHRcdGZvciAobGV0IHIgPSBvbGRSYW5rOyByIDwgbmV3UmFuazsgcisrKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgb3RoZXJSYW5rZXIgPSByYW5rZXJzT2xkW3JdO1xyXG5cdFx0XHRcdFx0aWYgKHJhbmtlci5ncm93aW5nICYmIChyYW5rZXIuYmlhcyA+IDAgfHwgcmFua2VyLm11bHRpcGxpZXIgPiAxKSkge1xyXG5cdFx0XHRcdFx0XHRyYW5rZXIuZ3JhcGVzKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmFua2VyIG9uIExhc3QgUGxhY2UgZ2FpbnMgMSBHcmFwZSwgb25seSBpZiBoZSBpc24ndCB0aGUgb25seSBvbmVcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoID49IE1hdGgubWF4KHRoaXMuc3RhdGUuaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdGxldCBsYXN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzW3RoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggLSAxXTtcclxuXHRcdFx0aWYgKGxhc3RSYW5rZXIuZ3Jvd2luZykge1xyXG5cdFx0XHRcdGxhc3RSYW5rZXIuZ3JhcGVzICs9IH5+c2Vjb25kc1Bhc3NlZDtcclxuXHRcdFx0XHRsYXN0UmFua2VyLnB1c2hIaXN0b3J5KCdMQVNUJywgeyBjdXJyZW50VGltZSwgb2xkUmFuazogMCB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVN0YXRzKCk7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQgPSB7XHJcblx0XHRcdGN1cnJlbnRUaW1lOiB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lLFxyXG5cdFx0XHRyYW5rZXJzOiB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKSxcclxuXHRcdFx0dGltZU9mZnNldDogMCxcclxuXHRcdH1cclxuXHRcdGZvciAobGV0IHJhbmtlciBvZiB0aGlzLnN0YXRlLnJhbmtlcnMpIHtcclxuXHRcdFx0cmFua2VyLmludGVycG9sYXRlZCA9IHtcclxuXHRcdFx0XHRoaXN0b3J5OiBbXSxcclxuXHRcdFx0XHRwb3dlcjogcmFua2VyLnBvd2VyLFxyXG5cdFx0XHRcdHBvaW50czogcmFua2VyLnBvaW50cyxcclxuXHRcdFx0XHRyYW5rOiByYW5rZXIucmFuayxcclxuXHRcdFx0XHR0aW1lT2Zmc2V0OiAwLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS51cGRhdGVSZWFsVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdH1cclxuXHJcblx0ZW5zdXJlU29ydGVkRGVzY2VuZGluZzxUPihhcnJheTogVFtdLCBmbjogKGVsOiBUKSA9PiBudW1iZXIpIHtcclxuXHRcdGxldCBwcmV2VmFsdWUgPSArSW5maW5pdHk7XHJcblx0XHRsZXQgc29ydGVkID0gdHJ1ZTtcclxuXHRcdGZvciAobGV0IGVsIG9mIGFycmF5KSB7XHJcblx0XHRcdGxldCB2YWx1ZSA9IGZuKGVsKTtcclxuXHRcdFx0aWYgKHZhbHVlID4gcHJldlZhbHVlKSB7XHJcblx0XHRcdFx0c29ydGVkID0gZmFsc2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0cHJldlZhbHVlID0gdmFsdWU7XHJcblx0XHR9XHJcblx0XHRpZiAoIXNvcnRlZCkge1xyXG5cdFx0XHRhcnJheS5zb3J0KChhLCBiKSA9PiBmbihiKSAtIGZuKGEpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNhbGN1bGF0ZVN0YXRzKCkge1xyXG5cdFx0dGhpcy5zdGF0ZS5wb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlID0gdGhpcy5jYWxjdWxhdGVQb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlKCk7XHJcblx0XHQvLyBcdC8vIEVUQVxyXG5cdFx0Ly8gXHQvLyBUT0RPOiBFVEFcclxuXHR9XHJcblxyXG5cdGludGVycG9sYXRlTGFkZGVyKHNlY29uZHNPZmZzZXQ6IG51bWJlcikge1xyXG5cdFx0bGV0IGN1cnJlbnRUaW1lID0gdGhpcy5zdGF0ZS5jdXJyZW50VGltZSArIHNlY29uZHNPZmZzZXQ7XHJcblx0XHR0aGlzLnN0YXRlLmludGVycG9sYXRlZC5jdXJyZW50VGltZSA9IGN1cnJlbnRUaW1lO1xyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQudGltZU9mZnNldCA9IHNlY29uZHNPZmZzZXQ7XHJcblx0XHRsZXQgc2Vjb25kc1Bhc3NlZCA9IHNlY29uZHNPZmZzZXQ7XHJcblxyXG5cdFx0dGhpcy5lbnN1cmVTb3J0ZWREZXNjZW5kaW5nKHRoaXMuc3RhdGUuaW50ZXJwb2xhdGVkLnJhbmtlcnMsIGUgPT4gZS5pbnRlcnBvbGF0ZWQucG9pbnRzKTtcclxuXHJcblx0XHR0aGlzLnN0YXRlLmludGVycG9sYXRlZC5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdHJhbmtlci5pbnRlcnBvbGF0ZWQucmFuayA9IHJhbms7XHJcblx0XHRcdC8vIElmIHRoZSByYW5rZXIgaXMgY3VycmVudGx5IHN0aWxsIG9uIGxhZGRlclxyXG5cdFx0XHRpZiAoIXJhbmtlci5ncm93aW5nKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBQb2ludHMgJiBQb3dlclxyXG5cdFx0XHRpZiAocmFuayAhPSAxKSB7XHJcblx0XHRcdFx0cmFua2VyLmludGVycG9sYXRlZC5wb3dlciA9IHJhbmtlci5wb3dlciArIE1hdGguZmxvb3IoKHJhbmtlci5iaWFzICsgcmFuayAtIDEpICogcmFua2VyLm11bHRpcGxpZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyYW5rZXIuaW50ZXJwb2xhdGVkLnBvaW50cyA9IHJhbmtlci5wb2ludHMgKyBNYXRoLmZsb29yKHJhbmtlci5wb3dlciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGV0IHJhbmtlcnNPbGQgPSB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKTtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5pbnRlcnBvbGF0ZWQucmFua2Vycy5zb3J0KChhLCBiKSA9PiBiLmludGVycG9sYXRlZC5wb2ludHMgLSBhLmludGVycG9sYXRlZC5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUuaW50ZXJwb2xhdGVkLnJhbmtlcnMuZm9yRWFjaCgocmFua2VyLCBpbmRleCwgbGlzdCkgPT4ge1xyXG5cdFx0XHRsZXQgbmV3UmFuayA9IGluZGV4ICsgMTtcclxuXHRcdFx0bGV0IG9sZFJhbmsgPSByYW5rZXIuaW50ZXJwb2xhdGVkLnJhbms7XHJcblx0XHRcdGlmIChuZXdSYW5rID09IG9sZFJhbmspIHJldHVybjtcclxuXHJcblx0XHRcdHJhbmtlci5pbnRlcnBvbGF0ZWQucmFuayA9IG5ld1Jhbms7XHJcblxyXG5cdFx0XHRpZiAobmV3UmFuayA8IG9sZFJhbmspXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdVUFJBTksnLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rIH0sIHRydWUpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0cmFua2VyLnB1c2hIaXN0b3J5KCdET1dOUkFOSycsIHsgY3VycmVudFRpbWUsIG9sZFJhbmsgfSwgdHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0fVxyXG5cclxuXHJcblx0Y2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCA8IE1hdGgubWF4KGluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKSkge1xyXG5cdFx0XHRyZXR1cm4gSW5maW5pdHk7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5maXJzdFJhbmtlci5wb2ludHMgPCBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlKSB7XHJcblx0XHRcdHJldHVybiBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlO1xyXG5cdFx0fVxyXG5cdFx0bGV0IGZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5maXJzdFJhbmtlcjtcclxuXHRcdGxldCBzZWNvbmRSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMV07XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA8IGluZm9EYXRhLmF1dG9Qcm9tb3RlTGFkZGVyKSB7XHJcblx0XHRcdGlmICghZmlyc3RSYW5rZXIueW91KSByZXR1cm4gZmlyc3RSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdFx0cmV0dXJuIHNlY29uZFJhbmtlci5wb2ludHMgKyAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBsZWFkaW5nUmFua2VyID0gZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgcHVyc3VpbmdSYW5rZXIgPSBmaXJzdFJhbmtlci55b3UgPyBzZWNvbmRSYW5rZXIgOiBmaXJzdFJhbmtlcjtcclxuXHJcblx0XHQvLyBIb3cgbWFueSBtb3JlIHBvaW50cyBkb2VzIHRoZSByYW5rZXIgZ2FpbiBhZ2FpbnN0IGhpcyBwdXJzdWVyLCBldmVyeSBTZWNvbmRcclxuXHRcdGxldCBwb3dlckRpZmYgPSAobGVhZGluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKSAtIChwdXJzdWluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKTtcclxuXHRcdC8vIENhbGN1bGF0ZSB0aGUgbmVlZGVkIFBvaW50IGRpZmZlcmVuY2UsIHRvIGhhdmUgZi5lLiAzMHNlY29uZHMgb2YgcG9pbnQgZ2VuZXJhdGlvbiB3aXRoIHRoZSBkaWZmZXJlbmNlIGluIHBvd2VyXHJcblx0XHRsZXQgbmVlZGVkUG9pbnREaWZmID0gTWF0aC5hYnMocG93ZXJEaWZmICogaW5mb0RhdGEubWFudWFsUHJvbW90ZVdhaXRUaW1lKTtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5tYXgoXHJcblx0XHRcdChsZWFkaW5nUmFua2VyLnlvdSA/IHB1cnN1aW5nUmFua2VyIDogbGVhZGluZ1JhbmtlcikucG9pbnRzICsgbmVlZGVkUG9pbnREaWZmLFxyXG5cdFx0XHRpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblxyXG5cdHJlcXVlc3QodHlwZTogJ2Fzc2hvbGUnIHwgJ2F1dG8tcHJvbW90ZScgfCAnYmlhcycgfCAnbXVsdGknIHwgJ3Byb21vdGUnIHwgJ3ZpbmVnYXInKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKCF0aGlzLmNhblJlcXVlc3QodHlwZSwgdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZCkpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coYGZha2VSZXF1ZXN0OiAlTyBjYW4ndCBkbyAlTyFgLCBWdWUudG9SYXcodGhpcy5zdGF0ZS55b3VyUmFua2VyKSwgdHlwZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoYC9hcHAvbGFkZGVyL3Bvc3QvJHt0eXBlfWAsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cdH1cclxuXHJcblx0ZmFrZVVwZGF0ZShzZWNvbmRzUGFzc2VkOiBudW1iZXIgPSAxKSB7XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihzZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblx0ZmFrZVJlcXVlc3QoZXZlbnRUeXBlOiBTb2NrZXRMYWRkZXJFdmVudFsnZXZlbnRUeXBlJ10sIGFjY291bnRJZDogYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZCkge1xyXG5cdFx0aWYgKCF0aGlzLmNhblJlcXVlc3QoZXZlbnRUeXBlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXy9nLCAnLScpIGFzIGFueSwgYWNjb3VudElkKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgZmFrZVJlcXVlc3Q6ICVPIGNhbid0IGRvICVPIWAsIFZ1ZS50b1Jhdyh0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2FjY291bnRJZF0pLCBldmVudFR5cGUpO1xyXG5cdFx0fVxyXG5cdFx0c3dpdGNoIChldmVudFR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnQklBUyc6XHJcblx0XHRcdGNhc2UgJ01VTFRJJzpcclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOlxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzpcclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzpcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHsgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXTtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHtcclxuXHRcdFx0XHRcdGV2ZW50VHlwZSwgYWNjb3VudElkLCBkYXRhOiB7XHJcblx0XHRcdFx0XHRcdGFtb3VudDogc291cmNlLnZpbmVnYXIgKyAnJyxcclxuXHRcdFx0XHRcdFx0c3VjY2Vzczogc291cmNlLnZpbmVnYXIgPiB0YXJnZXQudmluZWdhcixcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTsgYnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRldmVudFR5cGU7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignbm90IGltcGxlbWVudGVkJywgeyBmYWtlUmVxdWVzdDogdHJ1ZSwgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7XHJcblx0XHRcdFx0YWxlcnQoJ25vdCBpbXBsZW1lbnRlZCcpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIoMCk7XHJcblx0fVxyXG5cclxuXHJcblxyXG5cdGdldFVwZ3JhZGVDb3N0KGxldmVsOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBNYXRoLnJvdW5kKE1hdGgucG93KHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgKyAxLCBsZXZlbCkpO1xyXG5cdH1cclxuXHJcblx0Z2V0VmluZWdhclRocm93Q29zdCgpIHtcclxuXHRcdHJldHVybiB0aGlzLnN0YXRlLmluZm9EYXRhLmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyAqIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXI7XHJcblx0fVxyXG5cclxuXHRnZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rOiBudW1iZXIpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRsZXQgbWluUGVvcGxlID0gTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpO1xyXG5cdFx0bGV0IGRpdmlzb3IgPSBNYXRoLm1heChyYW5rIC0gbWluUGVvcGxlICsgMSwgMSk7XHJcblx0XHRyZXR1cm4gTWF0aC5mbG9vcihpbmZvRGF0YS5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSAvIGRpdmlzb3IpO1xyXG5cdH1cclxuXHJcblx0Z2V0Qmlhc0Nvc3QocmFua2VyOiBSYW5rZXIgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFVwZ3JhZGVDb3N0KHJhbmtlci5iaWFzICsgMSk7XHJcblx0fVxyXG5cdGdldE11bHRpcGxpZXJDb3N0KHJhbmtlcjogUmFua2VyID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRVcGdyYWRlQ29zdChyYW5rZXIubXVsdGlwbGllciArIDEpO1xyXG5cdH1cclxuXHJcblx0Y2FuUmVxdWVzdCh0eXBlOiAnYXNzaG9sZScgfCAnYXV0by1wcm9tb3RlJyB8ICdiaWFzJyB8ICdtdWx0aScgfCAncHJvbW90ZScgfCAndmluZWdhcicsIGFjY291bnRJZCA9IHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQpIHtcclxuXHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2FjY291bnRJZF07XHJcblx0XHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnYmlhcyc6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRCaWFzQ29zdChyYW5rZXIpIDw9IHJhbmtlci5wb2ludHM7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnbXVsdGknOiB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0TXVsdGlwbGllckNvc3QocmFua2VyKSA8PSByYW5rZXIucG93ZXI7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAndmluZWdhcic6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRWaW5lZ2FyVGhyb3dDb3N0KCkgPD0gcmFua2VyLnZpbmVnYXI7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAncHJvbW90ZSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gISEnVE9ETyc7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnYXV0by1wcm9tb3RlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdhc3Nob2xlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59XHJcblxyXG4iXX0=