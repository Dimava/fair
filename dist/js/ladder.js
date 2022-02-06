"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
    static from(source) {
        let ranker = source.you ? new YouRanker() : new Ranker();
        ranker.username = source.username;
        ranker.you = source.you;
        ranker.accountId = source.accountId;
        ranker.bias = source.bias;
        ranker.growing = source.growing;
        ranker.multiplier = source.multiplier;
        ranker.rank = source.rank;
        ranker.timesAsshole = source.timesAsshole;
        ranker.points = +source.points;
        ranker.power = +source.power;
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
        return `${numberFormatter.format(this.power)} [+${(this.bias + '').padStart(2, '0')} x${(this.multiplier + '').padStart(2, '0')}]`;
    }
    get pointsFormatted() {
        return numberFormatter.format(this.points);
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
            assholeTags: [''],
            baseVinegarNeededToThrow: 1000000,
            baseGrapesNeededToAutoPromote: 2000,
            manualPromoteWaitTime: 15,
            autoPromoteLadder: 2
        },
        pointsNeededForManualPromote: 0,
    });
    ladderSubscription;
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
        switch (event.eventType) {
            case 'BIAS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.bias++;
                ranker.points = 0;
                break;
            }
            case 'MULTI': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.multiplier++;
                ranker.bias = 0;
                ranker.points = 0;
                ranker.power = 0;
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
                ranker.username = event.data.username;
                ranker.rank = this.state.rankers.length + 1;
                if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
                    this.state.rankers.push(ranker);
                    this.state.rankersById[ranker.accountId] = ranker;
                }
                break;
            }
            case 'NAME_CHANGE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.username = event.data;
                break;
            }
            case 'RESET': {
                // disconnect is made automatically
                location.reload();
                break;
            }
        }
    }
    getAutoPromoteGrapeCost(rank) {
        let infoData = this.state.infoData;
        let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
        let divisor = Math.max(rank - minPeople + 1, 1);
        return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
    }
    handleInfo(message) {
        this.state.infoData = {
            assholeLadder: message.assholeLadder,
            assholeTags: message.assholeTags,
            autoPromoteLadder: message.autoPromoteLadder,
            baseGrapesNeededToAutoPromote: +message.baseGrapesNeededToAutoPromote,
            baseVinegarNeededToThrow: +message.baseVinegarNeededToThrow,
            manualPromoteWaitTime: message.manualPromoteWaitTime,
            minimumPeopleForPromote: message.minimumPeopleForPromote,
            pointsForPromote: +message.pointsForPromote,
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
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.userData.accountId = this.state.yourRanker.accountId;
                this.userData.username = this.state.yourRanker.username;
            }
        }
    }
    calculateLadder(secondsPassed) {
        // FIXME this uses 400ms per 8k rankers
        this.state.rankers.sort((a, b) => b.points - a.points);
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
                ranker.power += Math.floor((ranker.bias + rank - 1) * secondsPassed);
            }
            ranker.points += Math.floor(ranker.power * secondsPassed);
            // Calculating Vinegar based on Grapes count
            if (rank == 1) {
                if (this.state.currentLadder.number === 1)
                    ranker.vinegar *= ~~(0.9975 ** secondsPassed);
            }
            else {
                ranker.vinegar += ~~(ranker.grapes * secondsPassed);
            }
        });
        // let rankersOld = this.state.rankers.slice();
        // FIXME this uses 400ms per 8k rankers
        this.state.rankers.sort((a, b) => b.points - a.points);
        this.state.rankers.forEach((ranker, index, list) => {
            let rank = index + 1;
            if (rank == ranker.rank)
                return;
            if (rank < ranker.rank) {
                // rank increase, gain grapes
                for (let r = ranker.rank; r < rank; r++) {
                    // let otherRanker = rankersOld[r];
                    if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
                        ranker.grapes++;
                    }
                }
            }
            ranker.rank = rank;
        });
        // Ranker on Last Place gains 1 Grape, only if he isn't the only one
        if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            let lastRanker = this.state.rankers[this.state.rankers.length - 1];
            if (lastRanker.growing) {
                lastRanker.grapes += ~~secondsPassed;
            }
        }
        this.state.firstRanker = this.state.rankers[0];
        this.calculateStats();
    }
    calculateStats() {
        this.state.pointsNeededForManualPromote = this.calculatePointsNeededForManualPromote();
        // 	// ETA
        // 	// TODO: ETA
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
}
let FairLadderVue = class FairLadderVue extends VueWithProps({
    ladder: FairLadder,
}) {
    get _t() {
        let record = this.tableData[0];
        return `
			<LADDER>
				<a-table
						:columns="columns"
						:data-source="tableData"
						size="small"
						:rowKey="(record) => record.accountId"
						:rowClassName="(record, index)=>rowClassName(record)"
						:pagination="pagination"
						tableLayout="fixed"
						>
					    <template #headerCell="{ column }">
							<template v-if="column.key === 'username'">
								<span>
								smile-outlined
								Name
								</span>
							</template>
						</template>
				</a-table>

				<a-checkbox v-model:checked="onlyMe"> Show You </a-checkbox>
			</LADDER>
		`;
    }
    get pageSize() {
        return this.nearRankers * 2 + 1;
    }
    nearRankers = 7;
    columns = [
        { title: '#', dataIndex: 'rank' },
        { title: 'Username', dataIndex: 'username', key: 'username' },
        { title: 'Power', dataIndex: 'powerFormatted', key: 'power', align: 'right' },
        { title: 'Points', dataIndex: 'pointsFormatted', key: 'points', align: 'right' },
    ];
    constructor(...a) {
        super(...a);
        this.columns[1].filters = [
            { text: 'Center yourself', value: true }
        ];
        this.columns[1].onFilter = (value, ranker) => {
            if (!value)
                return true;
            if (ranker.rank == 1)
                return true;
            return this.centeredLimits.min <= ranker.rank
                && ranker.rank <= this.centeredLimits.max;
        };
    }
    get centeredLimits() {
        let state = this.ladder.state;
        let middleRank = state.yourRanker.rank;
        middleRank = Math.min(middleRank, state.rankers.length - this.nearRankers);
        middleRank = Math.max(middleRank, this.nearRankers + 1);
        return { min: middleRank - this.nearRankers + 1, max: middleRank + this.nearRankers };
    }
    get tableData() {
        return this.ladder.state.rankers;
    }
    get pagination() {
        return {
            defaultPageSize: this.pageSize,
            defaultCurrent: ~~(this.ladder.state.yourRanker.rank / this.pageSize) + 1,
            hideOnSinglePage: true,
        };
    }
    rowClassName(record) {
        return {
            'ranker-row-you': record.you,
            'ranker-row-promoted': !record.growing,
        };
    }
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxNQUFNO0lBQ1gsU0FBUyxHQUFjLENBQUMsQ0FBQztJQUN6QixRQUFRLEdBQVcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFVBQVUsR0FBVyxDQUFDLENBQUM7SUFDdkIsR0FBRyxHQUFZLEtBQUssQ0FBQztJQUNyQixPQUFPLEdBQVksSUFBSSxDQUFDO0lBQ3hCLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsTUFBTSxHQUFXLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQVcsQ0FBQyxDQUFDO0lBRXBCLElBQUksR0FBVyxDQUFDLENBQUM7SUFDakIsV0FBVyxHQUFZLEtBQUssQ0FBQztJQUc3QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQXNDO1FBQ2pELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9B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VUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3ZGLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUNsQyxDQUFDO0lBQ0QsSUFBSSxVQUFVO1FBQ2IsT0FBTztZQUNOLGVBQWUsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUM5QixjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztZQUN6RSxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0lBQ0QsWUFBWSxDQUFDLE1BQWM7UUFDMUIsT0FBTztZQUNOLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxHQUFHO1lBQzVCLHFCQUFxQixFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU87U0FDdEMsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBeEVBO0lBREMsV0FBVzt1Q0EyQlg7QUE5QkksYUFBYTtJQURsQixlQUFlO0dBQ1YsYUFBYSxDQTRFbEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcblxyXG5jbGFzcyBQbGF5ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5yZWFjdGl2ZSh0aGlzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFJhbmtlciB7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHVzZXJuYW1lOiBzdHJpbmcgPSAnJztcclxuXHRwb2ludHM6IG51bWJlciA9IDA7XHJcblx0cG93ZXI6IG51bWJlciA9IDE7XHJcblx0YmlhczogbnVtYmVyID0gMDtcclxuXHRtdWx0aXBsaWVyOiBudW1iZXIgPSAxO1xyXG5cdHlvdTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdGdyb3dpbmc6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHRpbWVzQXNzaG9sZTogbnVtYmVyID0gMDtcclxuXHRncmFwZXM6IG51bWJlciA9IDA7XHJcblx0dmluZWdhcjogbnVtYmVyID0gMDtcclxuXHJcblx0cmFuazogbnVtYmVyID0gMDtcclxuXHRhdXRvUHJvbW90ZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0WW91UmFua2VyKTogWW91UmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyKTogUmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyIHwgU29ja2V0WW91UmFua2VyKTogUmFua2VyIHwgWW91UmFua2VyIHtcclxuXHRcdGxldCByYW5rZXIgPSBzb3VyY2UueW91ID8gbmV3IFlvdVJhbmtlcigpIDogbmV3IFJhbmtlcigpO1xyXG5cdFx0cmFua2VyLnVzZXJuYW1lID0gc291cmNlLnVzZXJuYW1lO1xyXG5cdFx0cmFua2VyLnlvdSA9IHNvdXJjZS55b3U7XHJcblx0XHRyYW5rZXIuYWNjb3VudElkID0gc291cmNlLmFjY291bnRJZDtcclxuXHRcdHJhbmtlci5iaWFzID0gc291cmNlLmJpYXM7XHJcblx0XHRyYW5rZXIuZ3Jvd2luZyA9IHNvdXJjZS5ncm93aW5nO1xyXG5cdFx0cmFua2VyLm11bHRpcGxpZXIgPSBzb3VyY2UubXVsdGlwbGllcjtcclxuXHRcdHJhbmtlci5yYW5rID0gc291cmNlLnJhbms7XHJcblx0XHRyYW5rZXIudGltZXNBc3Nob2xlID0gc291cmNlLnRpbWVzQXNzaG9sZTtcclxuXHRcdHJhbmtlci5wb2ludHMgPSArc291cmNlLnBvaW50cztcclxuXHRcdHJhbmtlci5wb3dlciA9ICtzb3VyY2UucG93ZXI7XHJcblx0XHRpZiAoc291cmNlLnlvdSkge1xyXG5cdFx0XHRsZXQgeW91U291cmNlID0gc291cmNlIGFzIFNvY2tldFlvdVJhbmtlcjtcclxuXHRcdFx0bGV0IHlvdVJhbmtlciA9IHJhbmtlciBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdHlvdVJhbmtlci5hdXRvUHJvbW90ZSA9IHlvdVNvdXJjZS5hdXRvUHJvbW90ZTtcclxuXHRcdFx0eW91UmFua2VyLmdyYXBlcyA9ICt5b3VTb3VyY2UuZ3JhcGVzO1xyXG5cdFx0XHR5b3VSYW5rZXIudmluZWdhciA9ICt5b3VTb3VyY2UudmluZWdhcjtcclxuXHRcdH1cclxuXHRcdHJldHVybiByYW5rZXI7XHJcblx0fVxyXG5cclxuXHRnZXQgcG93ZXJGb3JtYXR0ZWQoKSB7XHJcblx0XHRyZXR1cm4gYCR7bnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh0aGlzLnBvd2VyKVxyXG5cdFx0XHR9IFsrJHsodGhpcy5iaWFzICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fSB4JHsodGhpcy5tdWx0aXBsaWVyICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fV1gO1xyXG5cdH1cclxuXHRnZXQgcG9pbnRzRm9ybWF0dGVkKCkge1xyXG5cdFx0cmV0dXJuIG51bWJlckZvcm1hdHRlci5mb3JtYXQodGhpcy5wb2ludHMpO1xyXG5cdH1cclxufVxyXG5jbGFzcyBZb3VSYW5rZXIgZXh0ZW5kcyBSYW5rZXIge1xyXG5cdHlvdSA9IHRydWU7XHJcbn1cclxuXHJcbmNsYXNzIEZhaXJMYWRkZXIge1xyXG5cdHNvY2tldD86IEZhaXJTb2NrZXQ7XHJcblx0dXNlckRhdGEgPSBuZXcgVXNlckRhdGEoKTtcclxuXHRzdGF0ZSA9IFZ1ZVJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdHJhbmtlcnNCeUlkOiB7fSBhcyBSZWNvcmQ8bnVtYmVyLCBSYW5rZXI+LFxyXG5cdFx0bGFkZGVyTnVtOiAxLFxyXG5cclxuXHRcdHZpbmVnYXJlZDoge1xyXG5cdFx0XHRqdXN0VmluZWdhcmVkOiBmYWxzZSxcclxuXHRcdFx0dmluZWdhcmVkQnk6IG5ldyBSYW5rZXIoKSxcclxuXHRcdFx0dmluZWdhclRocm93bjogMCxcclxuXHRcdH0sXHJcblxyXG5cdFx0Y3VycmVudExhZGRlcjoge1xyXG5cdFx0XHRudW1iZXI6IDAsXHJcblx0XHR9LFxyXG5cdFx0eW91clJhbmtlcjogbmV3IFlvdVJhbmtlcigpLFxyXG5cdFx0Zmlyc3RSYW5rZXI6IG5ldyBSYW5rZXIoKSxcclxuXHRcdHJhbmtlcnM6IFtuZXcgUmFua2VyKCldLFxyXG5cdFx0c3RhcnRSYW5rOiAwLFxyXG5cclxuXHRcdGluZm9EYXRhOiB7XHJcblx0XHRcdHBvaW50c0ZvclByb21vdGU6IDI1MDAwMDAwMCxcclxuXHRcdFx0bWluaW11bVBlb3BsZUZvclByb21vdGU6IDEwLFxyXG5cdFx0XHRhc3Nob2xlTGFkZGVyOiAxNSxcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IFsnJ10sXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogMTAwMDAwMCxcclxuXHRcdFx0YmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGU6IDIwMDAsXHJcblx0XHRcdG1hbnVhbFByb21vdGVXYWl0VGltZTogMTUsXHJcblx0XHRcdGF1dG9Qcm9tb3RlTGFkZGVyOiAyXHJcblx0XHR9LFxyXG5cclxuXHRcdHBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGU6IDAsXHJcblx0fSk7XHJcblx0bGFkZGVyU3Vic2NyaXB0aW9uOiBhbnk7XHJcblx0Y29ubmVjdCgpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMudXNlckRhdGEudXVpZCkgdGhyb3cgMDtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmNvbm5lY3RlZCB8fCB0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblxyXG5cdFx0dGhpcy5sYWRkZXJTdWJzY3JpcHRpb24gPSB0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy90b3BpYy9sYWRkZXIvJGxhZGRlck51bScsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlTGFkZGVyVXBkYXRlcyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMuc3RhdGUubGFkZGVyTnVtKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2xhZGRlci8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUxhZGRlckluaXQoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2xhZGRlci91cGRhdGVzJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVQcml2YXRlTGFkZGVyVXBkYXRlcyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvbGFkZGVyL2luaXQvJGxhZGRlck51bSdcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnN0YXRlLmxhZGRlck51bSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9pbmZvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVJbmZvKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9pbmZvJ1xyXG5cdFx0XHQsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pXHJcblxyXG5cdH1cclxuXHRkaXNjb25uZWN0KCkge1xyXG5cdFx0Ly8gdG9kb1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUxhZGRlclVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihtZXNzYWdlLnNlY29uZHNQYXNzZWQpO1xyXG5cdH1cclxuXHJcblx0aGFuZGxlRXZlbnQoZXZlbnQ6IFNvY2tldExhZGRlckV2ZW50KSB7XHJcblx0XHRjb25zb2xlLmxvZyhldmVudCk7XHJcblxyXG5cdFx0c3dpdGNoIChldmVudC5ldmVudFR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnQklBUyc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5iaWFzKys7XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnTVVMVEknOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIubXVsdGlwbGllcisrO1xyXG5cdFx0XHRcdHJhbmtlci5iaWFzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucG93ZXIgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1ZJTkVHQVInOiB7XHJcblx0XHRcdFx0bGV0IHZpbmVnYXJUaHJvd24gPSArZXZlbnQuZGF0YS5hbW91bnQ7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciA9IDA7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRcdFx0aWYgKHRhcmdldC55b3UpIHtcclxuXHRcdFx0XHRcdGlmIChldmVudC5kYXRhLnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGF0ZS52aW5lZ2FyZWQgPSB7XHJcblx0XHRcdFx0XHRcdFx0anVzdFZpbmVnYXJlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyZWRCeTogcmFua2VyLFxyXG5cdFx0XHRcdFx0XHRcdHZpbmVnYXJUaHJvd24sXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdC8vIGFsZXJ0KHJhbmtlci51c2VybmFtZSArIFwiIHRocmV3IHRoZWlyIFwiXHJcblx0XHRcdFx0XHRcdC8vICsgbnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh2aW5lZ2FyVGhyb3duKVxyXG5cdFx0XHRcdFx0XHQvLyArIFwiIFZpbmVnYXIgYXQgeW91IGFuZCBtYWRlIHlvdSBzbGlwIHRvIHRoZSBib3R0b20gb2YgdGhlIGxhZGRlci5cIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRhcmdldC52aW5lZ2FyID0gTWF0aC5tYXgoMCwgdGFyZ2V0LnZpbmVnYXIgLSB2aW5lZ2FyVGhyb3duKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdTT0ZUX1JFU0VUX1BPSU5UUyc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1BST01PVEUnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuZ3Jvd2luZyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRpZiAoZXZlbnQuYWNjb3VudElkID09IHRoaXMudXNlckRhdGEuYWNjb3VudElkKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgbmV3TGFkZGVyTnVtID0gbGFkZGVyRGF0YS5jdXJyZW50TGFkZGVyLm51bWJlciArIDFcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUxhZGRlcihuZXdMYWRkZXJOdW0pO1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlQ2hhdFJvb20obmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyYXBlcyAtPSB0aGlzLmdldEF1dG9Qcm9tb3RlR3JhcGVDb3N0KHJhbmtlci5yYW5rKTtcclxuXHRcdFx0XHRyYW5rZXIuYXV0b1Byb21vdGUgPSB0cnVlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0pPSU4nOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IG5ldyBSYW5rZXIoKTtcclxuXHRcdFx0XHRyYW5rZXIuYWNjb3VudElkID0gZXZlbnQuYWNjb3VudElkO1xyXG5cdFx0XHRcdHJhbmtlci51c2VybmFtZSA9IGV2ZW50LmRhdGEudXNlcm5hbWU7XHJcblx0XHRcdFx0cmFua2VyLnJhbmsgPSB0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoICsgMTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUucmFua2Vycy5maW5kKGUgPT4gZS5hY2NvdW50SWQgPT0gZXZlbnQuYWNjb3VudElkKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnB1c2gocmFua2VyKTtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbcmFua2VyLmFjY291bnRJZF0gPSByYW5rZXI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ05BTUVfQ0hBTkdFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gZXZlbnQuZGF0YTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdSRVNFVCc6IHtcclxuXHRcdFx0XHQvLyBkaXNjb25uZWN0IGlzIG1hZGUgYXV0b21hdGljYWxseVxyXG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHJcblx0Z2V0QXV0b1Byb21vdGVHcmFwZUNvc3QocmFuazogbnVtYmVyKSB7XHJcblx0XHRsZXQgaW5mb0RhdGEgPSB0aGlzLnN0YXRlLmluZm9EYXRhO1xyXG5cdFx0bGV0IG1pblBlb3BsZSA9IE1hdGgubWF4KGluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKTtcclxuXHRcdGxldCBkaXZpc29yID0gTWF0aC5tYXgocmFuayAtIG1pblBlb3BsZSArIDEsIDEpO1xyXG5cdFx0cmV0dXJuIE1hdGguZmxvb3IoaW5mb0RhdGEuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUgLyBkaXZpc29yKTtcclxuXHR9XHJcblxyXG5cdGhhbmRsZUluZm8obWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9pbmZvJ10pIHtcclxuXHRcdHRoaXMuc3RhdGUuaW5mb0RhdGEgPSB7XHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IG1lc3NhZ2UuYXNzaG9sZUxhZGRlcixcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IG1lc3NhZ2UuYXNzaG9sZVRhZ3MsXHJcblx0XHRcdGF1dG9Qcm9tb3RlTGFkZGVyOiBtZXNzYWdlLmF1dG9Qcm9tb3RlTGFkZGVyLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogK21lc3NhZ2UuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUsXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogK21lc3NhZ2UuYmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93LFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IG1lc3NhZ2UubWFudWFsUHJvbW90ZVdhaXRUaW1lLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogbWVzc2FnZS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSxcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogK21lc3NhZ2UucG9pbnRzRm9yUHJvbW90ZSxcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZVByaXZhdGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyL3VwZGF0ZXMnXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVMYWRkZXJJbml0KG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyLyddKSB7XHJcblx0XHRpZiAobWVzc2FnZS5zdGF0dXMgPT09IFwiT0tcIikge1xyXG5cdFx0XHRpZiAobWVzc2FnZS5jb250ZW50KSB7XHJcblx0XHRcdFx0bG9jYWxTdG9yYWdlLl9sYWRkZXIgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRMYWRkZXIubnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuc3RhcnRSYW5rID0gbWVzc2FnZS5jb250ZW50LnN0YXJ0UmFuaztcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnMgPSBtZXNzYWdlLmNvbnRlbnQucmFua2Vycy5tYXAoZSA9PiBSYW5rZXIuZnJvbShlKSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzQnlJZCA9IE9iamVjdC5mcm9tRW50cmllcyh0aGlzLnN0YXRlLnJhbmtlcnMubWFwKGUgPT4gW2UuYWNjb3VudElkLCBlXSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUueW91clJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbbWVzc2FnZS5jb250ZW50LnlvdXJSYW5rZXIuYWNjb3VudElkXSBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHR0aGlzLnVzZXJEYXRhLmFjY291bnRJZCA9IHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQ7XHJcblx0XHRcdFx0dGhpcy51c2VyRGF0YS51c2VybmFtZSA9IHRoaXMuc3RhdGUueW91clJhbmtlci51c2VybmFtZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlTGFkZGVyKHNlY29uZHNQYXNzZWQ6IG51bWJlcikge1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuc29ydCgoYSwgYikgPT4gYi5wb2ludHMgLSBhLnBvaW50cyk7XHJcblxyXG5cdFx0bGV0IGxhZGRlclN0YXRzID0ge1xyXG5cdFx0XHRncm93aW5nUmFua2VyQ291bnQ6IDAsXHJcblx0XHRcdHBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGU6IDAsXHJcblx0XHRcdGV0YTogMFxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4KSA9PiB7XHJcblx0XHRcdGxldCByYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRyYW5rZXIucmFuayA9IHJhbms7XHJcblx0XHRcdC8vIElmIHRoZSByYW5rZXIgaXMgY3VycmVudGx5IHN0aWxsIG9uIGxhZGRlclxyXG5cdFx0XHRpZiAoIXJhbmtlci5ncm93aW5nKSByZXR1cm47XHJcblx0XHRcdGxhZGRlclN0YXRzLmdyb3dpbmdSYW5rZXJDb3VudCArPSAxO1xyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRpbmcgUG9pbnRzICYgUG93ZXJcclxuXHRcdFx0aWYgKHJhbmsgIT0gMSkge1xyXG5cdFx0XHRcdHJhbmtlci5wb3dlciArPSBNYXRoLmZsb29yKChyYW5rZXIuYmlhcyArIHJhbmsgLSAxKSAqIHNlY29uZHNQYXNzZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJhbmtlci5wb2ludHMgKz0gTWF0aC5mbG9vcihyYW5rZXIucG93ZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBWaW5lZ2FyIGJhc2VkIG9uIEdyYXBlcyBjb3VudFxyXG5cdFx0XHRpZiAocmFuayA9PSAxKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPT09IDEpXHJcblx0XHRcdFx0XHRyYW5rZXIudmluZWdhciAqPSB+figwLjk5NzUgKiogc2Vjb25kc1Bhc3NlZCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgKz0gfn4ocmFua2VyLmdyYXBlcyAqIHNlY29uZHNQYXNzZWQpXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxldCByYW5rZXJzT2xkID0gdGhpcy5zdGF0ZS5yYW5rZXJzLnNsaWNlKCk7XHJcblx0XHQvLyBGSVhNRSB0aGlzIHVzZXMgNDAwbXMgcGVyIDhrIHJhbmtlcnNcclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5zb3J0KChhLCBiKSA9PiBiLnBvaW50cyAtIGEucG9pbnRzKTtcclxuXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuZm9yRWFjaCgocmFua2VyLCBpbmRleCwgbGlzdCkgPT4ge1xyXG5cdFx0XHRsZXQgcmFuayA9IGluZGV4ICsgMTtcclxuXHRcdFx0aWYgKHJhbmsgPT0gcmFua2VyLnJhbmspIHJldHVybjtcclxuXHJcblx0XHRcdGlmIChyYW5rIDwgcmFua2VyLnJhbmspIHtcclxuXHRcdFx0XHQvLyByYW5rIGluY3JlYXNlLCBnYWluIGdyYXBlc1xyXG5cdFx0XHRcdGZvciAobGV0IHIgPSByYW5rZXIucmFuazsgciA8IHJhbms7IHIrKykge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG90aGVyUmFua2VyID0gcmFua2Vyc09sZFtyXTtcclxuXHRcdFx0XHRcdGlmIChyYW5rZXIuZ3Jvd2luZyAmJiAocmFua2VyLmJpYXMgPiAwIHx8IHJhbmtlci5tdWx0aXBsaWVyID4gMSkpIHtcclxuXHRcdFx0XHRcdFx0cmFua2VyLmdyYXBlcysrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmFua2VyLnJhbmsgPSByYW5rO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmFua2VyIG9uIExhc3QgUGxhY2UgZ2FpbnMgMSBHcmFwZSwgb25seSBpZiBoZSBpc24ndCB0aGUgb25seSBvbmVcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoID49IE1hdGgubWF4KHRoaXMuc3RhdGUuaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdGxldCBsYXN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzW3RoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggLSAxXTtcclxuXHRcdFx0aWYgKGxhc3RSYW5rZXIuZ3Jvd2luZykge1xyXG5cdFx0XHRcdGxhc3RSYW5rZXIuZ3JhcGVzICs9IH5+c2Vjb25kc1Bhc3NlZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVN0YXRzKCk7XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVTdGF0cygpIHtcclxuXHRcdHRoaXMuc3RhdGUucG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSA9IHRoaXMuY2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpO1xyXG5cdFx0Ly8gXHQvLyBFVEFcclxuXHRcdC8vIFx0Ly8gVE9ETzogRVRBXHJcblx0fVxyXG5cdGNhbGN1bGF0ZVBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUoKSB7XHJcblx0XHRsZXQgaW5mb0RhdGEgPSB0aGlzLnN0YXRlLmluZm9EYXRhO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggPCBNYXRoLm1heChpbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcikpIHtcclxuXHRcdFx0cmV0dXJuIEluZmluaXR5O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIucG9pbnRzIDwgaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZSkge1xyXG5cdFx0XHRyZXR1cm4gaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZTtcclxuXHRcdH1cclxuXHRcdGxldCBmaXJzdFJhbmtlciA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgc2Vjb25kUmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzFdO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPCBpbmZvRGF0YS5hdXRvUHJvbW90ZUxhZGRlcikge1xyXG5cdFx0XHRpZiAoIWZpcnN0UmFua2VyLnlvdSkgcmV0dXJuIGZpcnN0UmFua2VyLnBvaW50cyArIDE7XHJcblx0XHRcdHJldHVybiBzZWNvbmRSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbGVhZGluZ1JhbmtlciA9IGZpcnN0UmFua2VyO1xyXG5cdFx0bGV0IHB1cnN1aW5nUmFua2VyID0gZmlyc3RSYW5rZXIueW91ID8gc2Vjb25kUmFua2VyIDogZmlyc3RSYW5rZXI7XHJcblxyXG5cdFx0Ly8gSG93IG1hbnkgbW9yZSBwb2ludHMgZG9lcyB0aGUgcmFua2VyIGdhaW4gYWdhaW5zdCBoaXMgcHVyc3VlciwgZXZlcnkgU2Vjb25kXHJcblx0XHRsZXQgcG93ZXJEaWZmID0gKGxlYWRpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCkgLSAocHVyc3VpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCk7XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5lZWRlZCBQb2ludCBkaWZmZXJlbmNlLCB0byBoYXZlIGYuZS4gMzBzZWNvbmRzIG9mIHBvaW50IGdlbmVyYXRpb24gd2l0aCB0aGUgZGlmZmVyZW5jZSBpbiBwb3dlclxyXG5cdFx0bGV0IG5lZWRlZFBvaW50RGlmZiA9IE1hdGguYWJzKHBvd2VyRGlmZiAqIGluZm9EYXRhLm1hbnVhbFByb21vdGVXYWl0VGltZSk7XHJcblxyXG5cdFx0cmV0dXJuIE1hdGgubWF4KFxyXG5cdFx0XHQobGVhZGluZ1Jhbmtlci55b3UgPyBwdXJzdWluZ1JhbmtlciA6IGxlYWRpbmdSYW5rZXIpLnBvaW50cyArIG5lZWRlZFBvaW50RGlmZixcclxuXHRcdFx0aW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cclxufVxyXG5cclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyTGFkZGVyVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgcmVjb3JkID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8TEFEREVSPlxyXG5cdFx0XHRcdDxhLXRhYmxlXHJcblx0XHRcdFx0XHRcdDpjb2x1bW5zPVwiY29sdW1uc1wiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cInRhYmxlRGF0YVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiXHJcblx0XHRcdFx0XHRcdDpyb3dLZXk9XCIocmVjb3JkKSA9PiByZWNvcmQuYWNjb3VudElkXCJcclxuXHRcdFx0XHRcdFx0OnJvd0NsYXNzTmFtZT1cIihyZWNvcmQsIGluZGV4KT0+cm93Q2xhc3NOYW1lKHJlY29yZClcIlxyXG5cdFx0XHRcdFx0XHQ6cGFnaW5hdGlvbj1cInBhZ2luYXRpb25cIlxyXG5cdFx0XHRcdFx0XHR0YWJsZUxheW91dD1cImZpeGVkXCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0ICAgIDx0ZW1wbGF0ZSAjaGVhZGVyQ2VsbD1cInsgY29sdW1uIH1cIj5cclxuXHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT09ICd1c2VybmFtZSdcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxzcGFuPlxyXG5cdFx0XHRcdFx0XHRcdFx0c21pbGUtb3V0bGluZWRcclxuXHRcdFx0XHRcdFx0XHRcdE5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdDwvc3Bhbj5cclxuXHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS10YWJsZT5cclxuXHJcblx0XHRcdFx0PGEtY2hlY2tib3ggdi1tb2RlbDpjaGVja2VkPVwib25seU1lXCI+IFNob3cgWW91IDwvYS1jaGVja2JveD5cclxuXHRcdFx0PC9MQURERVI+XHJcblx0XHRgXHJcblx0fVxyXG5cdGdldCBwYWdlU2l6ZSgpIHtcclxuXHRcdHJldHVybiB0aGlzLm5lYXJSYW5rZXJzICogMiArIDE7XHJcblx0fVxyXG5cdG5lYXJSYW5rZXJzID0gNztcclxuXHRjb2x1bW5zOiBFeGNsdWRlPGFudGQuVGFibGVQcm9wczxSYW5rZXI+Wydjb2x1bW5zJ10sIHVuZGVmaW5lZD4gPSBbXHJcblx0XHR7IHRpdGxlOiAnIycsIGRhdGFJbmRleDogJ3JhbmsnIH0sXHJcblx0XHR7IHRpdGxlOiAnVXNlcm5hbWUnLCBkYXRhSW5kZXg6ICd1c2VybmFtZScsIGtleTogJ3VzZXJuYW1lJyB9LFxyXG5cdFx0eyB0aXRsZTogJ1Bvd2VyJywgZGF0YUluZGV4OiAncG93ZXJGb3JtYXR0ZWQnLCBrZXk6ICdwb3dlcicsIGFsaWduOiAncmlnaHQnIH0sXHJcblx0XHR7IHRpdGxlOiAnUG9pbnRzJywgZGF0YUluZGV4OiAncG9pbnRzRm9ybWF0dGVkJywga2V5OiAncG9pbnRzJywgYWxpZ246ICdyaWdodCcgfSxcclxuXHRdO1xyXG5cdGNvbnN0cnVjdG9yKC4uLmE6IGFueVtdKSB7XHJcblx0XHRzdXBlciguLi5hKTtcclxuXHRcdHRoaXMuY29sdW1uc1sxXS5maWx0ZXJzID0gW1xyXG5cdFx0XHR7IHRleHQ6ICdDZW50ZXIgeW91cnNlbGYnLCB2YWx1ZTogdHJ1ZSB9XHJcblx0XHRdO1xyXG5cdFx0dGhpcy5jb2x1bW5zWzFdLm9uRmlsdGVyID0gKHZhbHVlLCByYW5rZXI6IFJhbmtlcikgPT4ge1xyXG5cdFx0XHRpZiAoIXZhbHVlKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0aWYgKHJhbmtlci5yYW5rID09IDEpIHJldHVybiB0cnVlO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jZW50ZXJlZExpbWl0cy5taW4gPD0gcmFua2VyLnJhbmtcclxuXHRcdFx0XHQmJiByYW5rZXIucmFuayA8PSB0aGlzLmNlbnRlcmVkTGltaXRzLm1heDtcclxuXHRcdH1cclxuXHR9XHJcblx0Z2V0IGNlbnRlcmVkTGltaXRzKCkge1xyXG5cdFx0bGV0IHN0YXRlID0gdGhpcy5sYWRkZXIuc3RhdGU7XHJcblx0XHRsZXQgbWlkZGxlUmFuayA9IHN0YXRlLnlvdXJSYW5rZXIucmFuaztcclxuXHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1pbihtaWRkbGVSYW5rLCBzdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIHRoaXMubmVhclJhbmtlcnMpO1xyXG5cdFx0bWlkZGxlUmFuayA9IE1hdGgubWF4KG1pZGRsZVJhbmssIHRoaXMubmVhclJhbmtlcnMgKyAxKTtcclxuXHRcdHJldHVybiB7IG1pbjogbWlkZGxlUmFuayAtIHRoaXMubmVhclJhbmtlcnMgKyAxLCBtYXg6IG1pZGRsZVJhbmsgKyB0aGlzLm5lYXJSYW5rZXJzIH07XHJcblx0fVxyXG5cdGdldCB0YWJsZURhdGEoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUucmFua2VycztcclxuXHR9XHJcblx0Z2V0IHBhZ2luYXRpb24oKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRkZWZhdWx0UGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdGRlZmF1bHRDdXJyZW50OiB+fih0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKSArIDEsXHJcblx0XHRcdGhpZGVPblNpbmdsZVBhZ2U6IHRydWUsXHJcblx0XHR9O1xyXG5cdH1cclxuXHRyb3dDbGFzc05hbWUocmVjb3JkOiBSYW5rZXIpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdCdyYW5rZXItcm93LXlvdSc6IHJlY29yZC55b3UsXHJcblx0XHRcdCdyYW5rZXItcm93LXByb21vdGVkJzogIXJlY29yZC5ncm93aW5nLFxyXG5cdFx0fTtcclxuXHR9XHJcbn0iXX0=