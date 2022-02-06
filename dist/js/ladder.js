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
        return `
			<LADDER>
				<a-table
					:columns="columns"
					:data-source="tableData"
					size="small"
					:rowClassName="(record, index)=>rowClassName(record)"
					:pagination="pagination"
					tableLayout="fixed"
					>
				</a-table>

				<a-checkbox v-model:checked="onlyMe"> Show You </a-checkbox>
			</LADDER>
		`;
    }
    onlyMe = true;
    get pageSize() {
        return this.nearRankers * 2 + 1;
    }
    nearRankers = 7;
    get columns() {
        return [
            { title: '#', dataIndex: 'rank' },
            { title: 'Username', dataIndex: 'username' },
            { title: 'Power', dataIndex: 'power' },
            { title: 'Points', dataIndex: 'points' },
        ];
    }
    get tableData() {
        if (this.onlyMe) {
            let state = this.ladder.state;
            let middleRank = state.yourRanker.rank;
            middleRank = Math.min(middleRank, state.rankers.length - this.nearRankers);
            middleRank = Math.max(middleRank, this.nearRankers + 1);
            let rankers = [state.firstRanker, ...state.rankers.slice(middleRank - this.nearRankers, middleRank + this.nearRankers)];
            return rankers;
        }
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
        return record.you ? 'row-you' : '';
    }
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxNQUFNO0lBQ1gsU0FBUyxHQUFjLENBQUMsQ0FBQztJQUN6QixRQUFRLEdBQVcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFVBQVUsR0FBVyxDQUFDLENBQUM7SUFDdkIsR0FBRyxHQUFZLEtBQUssQ0FBQztJQUNyQixPQUFPLEdBQVksSUFBSSxDQUFDO0lBQ3hCLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsTUFBTSxHQUFXLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQVcsQ0FBQyxDQUFDO0lBRXBCLElBQUksR0FBVyxDQUFDLENBQUM7SUFDakIsV0FBVyxHQUFZLEtBQUssQ0FBQztJQUc3QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQXNDO1FBQ2pELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9B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QUFXLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDeEgsT0FBTyxPQUFPLENBQUM7U0FDZjtRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0lBQ2xDLENBQUM7SUFDRCxJQUFJLFVBQVU7UUFDYixPQUFPO1lBQ04sZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQzlCLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ3pFLGdCQUFnQixFQUFFLElBQUk7U0FDdEIsQ0FBQztJQUNILENBQUM7SUFDRCxZQUFZLENBQUMsTUFBYztRQUMxQixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3BDLENBQUM7Q0FDRCxDQUFBO0FBbkRBO0lBREMsV0FBVzt1Q0FpQlg7QUFwQkksYUFBYTtJQURsQixlQUFlO0dBQ1YsYUFBYSxDQXVEbEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcblxyXG5jbGFzcyBQbGF5ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5yZWFjdGl2ZSh0aGlzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFJhbmtlciB7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHVzZXJuYW1lOiBzdHJpbmcgPSAnJztcclxuXHRwb2ludHM6IG51bWJlciA9IDA7XHJcblx0cG93ZXI6IG51bWJlciA9IDE7XHJcblx0YmlhczogbnVtYmVyID0gMDtcclxuXHRtdWx0aXBsaWVyOiBudW1iZXIgPSAxO1xyXG5cdHlvdTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdGdyb3dpbmc6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHRpbWVzQXNzaG9sZTogbnVtYmVyID0gMDtcclxuXHRncmFwZXM6IG51bWJlciA9IDA7XHJcblx0dmluZWdhcjogbnVtYmVyID0gMDtcclxuXHJcblx0cmFuazogbnVtYmVyID0gMDtcclxuXHRhdXRvUHJvbW90ZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0WW91UmFua2VyKTogWW91UmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyKTogUmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyIHwgU29ja2V0WW91UmFua2VyKTogUmFua2VyIHwgWW91UmFua2VyIHtcclxuXHRcdGxldCByYW5rZXIgPSBzb3VyY2UueW91ID8gbmV3IFlvdVJhbmtlcigpIDogbmV3IFJhbmtlcigpO1xyXG5cdFx0cmFua2VyLnVzZXJuYW1lID0gc291cmNlLnVzZXJuYW1lO1xyXG5cdFx0cmFua2VyLnlvdSA9IHNvdXJjZS55b3U7XHJcblx0XHRyYW5rZXIuYWNjb3VudElkID0gc291cmNlLmFjY291bnRJZDtcclxuXHRcdHJhbmtlci5iaWFzID0gc291cmNlLmJpYXM7XHJcblx0XHRyYW5rZXIuZ3Jvd2luZyA9IHNvdXJjZS5ncm93aW5nO1xyXG5cdFx0cmFua2VyLm11bHRpcGxpZXIgPSBzb3VyY2UubXVsdGlwbGllcjtcclxuXHRcdHJhbmtlci5yYW5rID0gc291cmNlLnJhbms7XHJcblx0XHRyYW5rZXIudGltZXNBc3Nob2xlID0gc291cmNlLnRpbWVzQXNzaG9sZTtcclxuXHRcdHJhbmtlci5wb2ludHMgPSArc291cmNlLnBvaW50cztcclxuXHRcdHJhbmtlci5wb3dlciA9ICtzb3VyY2UucG93ZXI7XHJcblx0XHRpZiAoc291cmNlLnlvdSkge1xyXG5cdFx0XHRsZXQgeW91U291cmNlID0gc291cmNlIGFzIFNvY2tldFlvdVJhbmtlcjtcclxuXHRcdFx0bGV0IHlvdVJhbmtlciA9IHJhbmtlciBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdHlvdVJhbmtlci5hdXRvUHJvbW90ZSA9IHlvdVNvdXJjZS5hdXRvUHJvbW90ZTtcclxuXHRcdFx0eW91UmFua2VyLmdyYXBlcyA9ICt5b3VTb3VyY2UuZ3JhcGVzO1xyXG5cdFx0XHR5b3VSYW5rZXIudmluZWdhciA9ICt5b3VTb3VyY2UudmluZWdhcjtcclxuXHRcdH1cclxuXHRcdHJldHVybiByYW5rZXI7XHJcblx0fVxyXG59XHJcbmNsYXNzIFlvdVJhbmtlciBleHRlbmRzIFJhbmtlciB7XHJcblx0eW91ID0gdHJ1ZTtcclxufVxyXG5cclxuY2xhc3MgRmFpckxhZGRlciB7XHJcblx0c29ja2V0PzogRmFpclNvY2tldDtcclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlUmVhY3RpdmUoe1xyXG5cdFx0Y29ubmVjdGVkOiBmYWxzZSxcclxuXHRcdGNvbm5lY3Rpb25SZXF1ZXN0ZWQ6IGZhbHNlLFxyXG5cdFx0cmFua2Vyc0J5SWQ6IHt9IGFzIFJlY29yZDxudW1iZXIsIFJhbmtlcj4sXHJcblx0XHRsYWRkZXJOdW06IDEsXHJcblxyXG5cdFx0dmluZWdhcmVkOiB7XHJcblx0XHRcdGp1c3RWaW5lZ2FyZWQ6IGZhbHNlLFxyXG5cdFx0XHR2aW5lZ2FyZWRCeTogbmV3IFJhbmtlcigpLFxyXG5cdFx0XHR2aW5lZ2FyVGhyb3duOiAwLFxyXG5cdFx0fSxcclxuXHJcblx0XHRjdXJyZW50TGFkZGVyOiB7XHJcblx0XHRcdG51bWJlcjogMCxcclxuXHRcdH0sXHJcblx0XHR5b3VyUmFua2VyOiBuZXcgWW91UmFua2VyKCksXHJcblx0XHRmaXJzdFJhbmtlcjogbmV3IFJhbmtlcigpLFxyXG5cdFx0cmFua2VyczogW25ldyBSYW5rZXIoKV0sXHJcblx0XHRzdGFydFJhbms6IDAsXHJcblxyXG5cdFx0aW5mb0RhdGE6IHtcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogMjUwMDAwMDAwLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogMTAsXHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IDE1LFxyXG5cdFx0XHRhc3Nob2xlVGFnczogWycnXSxcclxuXHRcdFx0YmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93OiAxMDAwMDAwLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogMjAwMCxcclxuXHRcdFx0bWFudWFsUHJvbW90ZVdhaXRUaW1lOiAxNSxcclxuXHRcdFx0YXV0b1Byb21vdGVMYWRkZXI6IDJcclxuXHRcdH0sXHJcblxyXG5cdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHR9KTtcclxuXHRsYWRkZXJTdWJzY3JpcHRpb246IGFueTtcclxuXHRjb25uZWN0KCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB0aHJvdyAwO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY29ubmVjdGVkIHx8IHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLmxhZGRlclN1YnNjcmlwdGlvbiA9IHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5zdGF0ZS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvbGFkZGVyLycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlTGFkZGVySW5pdChkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvbGFkZGVyL3VwZGF0ZXMnLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZVByaXZhdGVMYWRkZXJVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9sYWRkZXIvaW5pdC8kbGFkZGVyTnVtJ1xyXG5cdFx0XHQsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMuc3RhdGUubGFkZGVyTnVtKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2luZm8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUluZm8oZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2luZm8nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSlcclxuXHJcblx0fVxyXG5cdGRpc2Nvbm5lY3QoKSB7XHJcblx0XHQvLyB0b2RvXHJcblx0fVxyXG5cclxuXHJcblx0aGFuZGxlTGFkZGVyVXBkYXRlcyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy90b3BpYy9sYWRkZXIvJGxhZGRlck51bSddKSB7XHJcblx0XHRmb3IgKGxldCBldmVudCBvZiBtZXNzYWdlLmV2ZW50cykge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUV2ZW50KGV2ZW50KTtcclxuXHRcdH1cclxuXHRcdHRoaXMuY2FsY3VsYXRlTGFkZGVyKG1lc3NhZ2Uuc2Vjb25kc1Bhc3NlZCk7XHJcblx0fVxyXG5cclxuXHRoYW5kbGVFdmVudChldmVudDogU29ja2V0TGFkZGVyRXZlbnQpIHtcclxuXHRcdGNvbnNvbGUubG9nKGV2ZW50KTtcclxuXHJcblx0XHRzd2l0Y2ggKGV2ZW50LmV2ZW50VHlwZSkge1xyXG5cdFx0XHRjYXNlICdCSUFTJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmJpYXMrKztcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdNVUxUSSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5tdWx0aXBsaWVyKys7XHJcblx0XHRcdFx0cmFua2VyLmJpYXMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wb3dlciA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnVklORUdBUic6IHtcclxuXHRcdFx0XHRsZXQgdmluZWdhclRocm93biA9ICtldmVudC5kYXRhLmFtb3VudDtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci52aW5lZ2FyID0gMDtcclxuXHRcdFx0XHRsZXQgdGFyZ2V0ID0gdGhpcy5zdGF0ZS5maXJzdFJhbmtlcjtcclxuXHRcdFx0XHRpZiAodGFyZ2V0LnlvdSkge1xyXG5cdFx0XHRcdFx0aWYgKGV2ZW50LmRhdGEuc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YXRlLnZpbmVnYXJlZCA9IHtcclxuXHRcdFx0XHRcdFx0XHRqdXN0VmluZWdhcmVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdHZpbmVnYXJlZEJ5OiByYW5rZXIsXHJcblx0XHRcdFx0XHRcdFx0dmluZWdhclRocm93bixcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0Ly8gYWxlcnQocmFua2VyLnVzZXJuYW1lICsgXCIgdGhyZXcgdGhlaXIgXCJcclxuXHRcdFx0XHRcdFx0Ly8gKyBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KHZpbmVnYXJUaHJvd24pXHJcblx0XHRcdFx0XHRcdC8vICsgXCIgVmluZWdhciBhdCB5b3UgYW5kIG1hZGUgeW91IHNsaXAgdG8gdGhlIGJvdHRvbSBvZiB0aGUgbGFkZGVyLlwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGFyZ2V0LnZpbmVnYXIgPSBNYXRoLm1heCgwLCB0YXJnZXQudmluZWdhciAtIHZpbmVnYXJUaHJvd24pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1NPRlRfUkVTRVRfUE9JTlRTJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnUFJPTU9URSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5ncm93aW5nID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdGlmIChldmVudC5hY2NvdW50SWQgPT0gdGhpcy51c2VyRGF0YS5hY2NvdW50SWQpIHtcclxuXHRcdFx0XHRcdC8vIGxldCBuZXdMYWRkZXJOdW0gPSBsYWRkZXJEYXRhLmN1cnJlbnRMYWRkZXIubnVtYmVyICsgMVxyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlTGFkZGVyKG5ld0xhZGRlck51bSk7XHJcblx0XHRcdFx0XHQvLyBjaGFuZ2VDaGF0Um9vbShuZXdMYWRkZXJOdW0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdBVVRPX1BST01PVEUnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuZ3JhcGVzIC09IHRoaXMuZ2V0QXV0b1Byb21vdGVHcmFwZUNvc3QocmFua2VyLnJhbmspO1xyXG5cdFx0XHRcdHJhbmtlci5hdXRvUHJvbW90ZSA9IHRydWU7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnSk9JTic6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gbmV3IFJhbmtlcigpO1xyXG5cdFx0XHRcdHJhbmtlci5hY2NvdW50SWQgPSBldmVudC5hY2NvdW50SWQ7XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gZXZlbnQuZGF0YS51c2VybmFtZTtcclxuXHRcdFx0XHRyYW5rZXIucmFuayA9IHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggKyAxO1xyXG5cdFx0XHRcdGlmICghdGhpcy5zdGF0ZS5yYW5rZXJzLmZpbmQoZSA9PiBlLmFjY291bnRJZCA9PSBldmVudC5hY2NvdW50SWQpKSB7XHJcblx0XHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnMucHVzaChyYW5rZXIpO1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtyYW5rZXIuYWNjb3VudElkXSA9IHJhbmtlcjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnTkFNRV9DSEFOR0UnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIudXNlcm5hbWUgPSBldmVudC5kYXRhO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1JFU0VUJzoge1xyXG5cdFx0XHRcdC8vIGRpc2Nvbm5lY3QgaXMgbWFkZSBhdXRvbWF0aWNhbGx5XHJcblx0XHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cclxuXHRnZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rOiBudW1iZXIpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRsZXQgbWluUGVvcGxlID0gTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpO1xyXG5cdFx0bGV0IGRpdmlzb3IgPSBNYXRoLm1heChyYW5rIC0gbWluUGVvcGxlICsgMSwgMSk7XHJcblx0XHRyZXR1cm4gTWF0aC5mbG9vcihpbmZvRGF0YS5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSAvIGRpdmlzb3IpO1xyXG5cdH1cclxuXHJcblx0aGFuZGxlSW5mbyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2luZm8nXSkge1xyXG5cdFx0dGhpcy5zdGF0ZS5pbmZvRGF0YSA9IHtcclxuXHRcdFx0YXNzaG9sZUxhZGRlcjogbWVzc2FnZS5hc3Nob2xlTGFkZGVyLFxyXG5cdFx0XHRhc3Nob2xlVGFnczogbWVzc2FnZS5hc3Nob2xlVGFncyxcclxuXHRcdFx0YXV0b1Byb21vdGVMYWRkZXI6IG1lc3NhZ2UuYXV0b1Byb21vdGVMYWRkZXIsXHJcblx0XHRcdGJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlOiArbWVzc2FnZS5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSxcclxuXHRcdFx0YmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93OiArbWVzc2FnZS5iYXNlVmluZWdhck5lZWRlZFRvVGhyb3csXHJcblx0XHRcdG1hbnVhbFByb21vdGVXYWl0VGltZTogbWVzc2FnZS5tYW51YWxQcm9tb3RlV2FpdFRpbWUsXHJcblx0XHRcdG1pbmltdW1QZW9wbGVGb3JQcm9tb3RlOiBtZXNzYWdlLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLFxyXG5cdFx0XHRwb2ludHNGb3JQcm9tb3RlOiArbWVzc2FnZS5wb2ludHNGb3JQcm9tb3RlLFxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcyddKSB7XHJcblx0XHRmb3IgKGxldCBldmVudCBvZiBtZXNzYWdlLmV2ZW50cykge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUV2ZW50KGV2ZW50KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZUxhZGRlckluaXQobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9sYWRkZXIvJ10pIHtcclxuXHRcdGlmIChtZXNzYWdlLnN0YXR1cyA9PT0gXCJPS1wiKSB7XHJcblx0XHRcdGlmIChtZXNzYWdlLmNvbnRlbnQpIHtcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2UuX2xhZGRlciA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudExhZGRlci5udW1iZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5zdGFydFJhbmsgPSBtZXNzYWdlLmNvbnRlbnQuc3RhcnRSYW5rO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUucmFua2VycyA9IG1lc3NhZ2UuY29udGVudC5yYW5rZXJzLm1hcChlID0+IFJhbmtlci5mcm9tKGUpKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnNCeUlkID0gT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMuc3RhdGUucmFua2Vycy5tYXAoZSA9PiBbZS5hY2NvdW50SWQsIGVdKSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS55b3VyUmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFttZXNzYWdlLmNvbnRlbnQueW91clJhbmtlci5hY2NvdW50SWRdIGFzIFlvdVJhbmtlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzBdO1xyXG5cclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3RlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdHRoaXMudXNlckRhdGEuYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZDtcclxuXHRcdFx0XHR0aGlzLnVzZXJEYXRhLnVzZXJuYW1lID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLnVzZXJuYW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVMYWRkZXIoc2Vjb25kc1Bhc3NlZDogbnVtYmVyKSB7XHJcblx0XHQvLyBGSVhNRSB0aGlzIHVzZXMgNDAwbXMgcGVyIDhrIHJhbmtlcnNcclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5zb3J0KChhLCBiKSA9PiBiLnBvaW50cyAtIGEucG9pbnRzKTtcclxuXHJcblx0XHRsZXQgbGFkZGVyU3RhdHMgPSB7XHJcblx0XHRcdGdyb3dpbmdSYW5rZXJDb3VudDogMCxcclxuXHRcdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHRcdFx0ZXRhOiAwXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdHJhbmtlci5yYW5rID0gcmFuaztcclxuXHRcdFx0Ly8gSWYgdGhlIHJhbmtlciBpcyBjdXJyZW50bHkgc3RpbGwgb24gbGFkZGVyXHJcblx0XHRcdGlmICghcmFua2VyLmdyb3dpbmcpIHJldHVybjtcclxuXHRcdFx0bGFkZGVyU3RhdHMuZ3Jvd2luZ1JhbmtlckNvdW50ICs9IDE7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBQb2ludHMgJiBQb3dlclxyXG5cdFx0XHRpZiAocmFuayAhPSAxKSB7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyICs9IE1hdGguZmxvb3IoKHJhbmtlci5iaWFzICsgcmFuayAtIDEpICogc2Vjb25kc1Bhc3NlZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmFua2VyLnBvaW50cyArPSBNYXRoLmZsb29yKHJhbmtlci5wb3dlciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cclxuXHJcblx0XHRcdC8vIENhbGN1bGF0aW5nIFZpbmVnYXIgYmFzZWQgb24gR3JhcGVzIGNvdW50XHJcblx0XHRcdGlmIChyYW5rID09IDEpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9PT0gMSlcclxuXHRcdFx0XHRcdHJhbmtlci52aW5lZ2FyICo9IH5+KDAuOTk3NSAqKiBzZWNvbmRzUGFzc2VkKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciArPSB+fihyYW5rZXIuZ3JhcGVzICogc2Vjb25kc1Bhc3NlZClcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGV0IHJhbmtlcnNPbGQgPSB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKTtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIucG9pbnRzIC0gYS5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4LCBsaXN0KSA9PiB7XHJcblx0XHRcdGxldCByYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRpZiAocmFuayA9PSByYW5rZXIucmFuaykgcmV0dXJuO1xyXG5cclxuXHRcdFx0aWYgKHJhbmsgPCByYW5rZXIucmFuaykge1xyXG5cdFx0XHRcdC8vIHJhbmsgaW5jcmVhc2UsIGdhaW4gZ3JhcGVzXHJcblx0XHRcdFx0Zm9yIChsZXQgciA9IHJhbmtlci5yYW5rOyByIDwgcmFuazsgcisrKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgb3RoZXJSYW5rZXIgPSByYW5rZXJzT2xkW3JdO1xyXG5cdFx0XHRcdFx0aWYgKHJhbmtlci5ncm93aW5nICYmIChyYW5rZXIuYmlhcyA+IDAgfHwgcmFua2VyLm11bHRpcGxpZXIgPiAxKSkge1xyXG5cdFx0XHRcdFx0XHRyYW5rZXIuZ3JhcGVzKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyYW5rZXIucmFuayA9IHJhbms7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSYW5rZXIgb24gTGFzdCBQbGFjZSBnYWlucyAxIEdyYXBlLCBvbmx5IGlmIGhlIGlzbid0IHRoZSBvbmx5IG9uZVxyXG5cdFx0aWYgKHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggPj0gTWF0aC5tYXgodGhpcy5zdGF0ZS5pbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcikpIHtcclxuXHRcdFx0bGV0IGxhc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbdGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRpZiAobGFzdFJhbmtlci5ncm93aW5nKSB7XHJcblx0XHRcdFx0bGFzdFJhbmtlci5ncmFwZXMgKz0gfn5zZWNvbmRzUGFzc2VkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR0aGlzLnN0YXRlLmZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzBdO1xyXG5cclxuXHRcdHRoaXMuY2FsY3VsYXRlU3RhdHMoKTtcclxuXHR9XHJcblxyXG5cdGNhbGN1bGF0ZVN0YXRzKCkge1xyXG5cdFx0dGhpcy5zdGF0ZS5wb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlID0gdGhpcy5jYWxjdWxhdGVQb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlKCk7XHJcblx0XHQvLyBcdC8vIEVUQVxyXG5cdFx0Ly8gXHQvLyBUT0RPOiBFVEFcclxuXHR9XHJcblx0Y2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCA8IE1hdGgubWF4KGluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKSkge1xyXG5cdFx0XHRyZXR1cm4gSW5maW5pdHk7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5maXJzdFJhbmtlci5wb2ludHMgPCBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlKSB7XHJcblx0XHRcdHJldHVybiBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlO1xyXG5cdFx0fVxyXG5cdFx0bGV0IGZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5maXJzdFJhbmtlcjtcclxuXHRcdGxldCBzZWNvbmRSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMV07XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA8IGluZm9EYXRhLmF1dG9Qcm9tb3RlTGFkZGVyKSB7XHJcblx0XHRcdGlmICghZmlyc3RSYW5rZXIueW91KSByZXR1cm4gZmlyc3RSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdFx0cmV0dXJuIHNlY29uZFJhbmtlci5wb2ludHMgKyAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBsZWFkaW5nUmFua2VyID0gZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgcHVyc3VpbmdSYW5rZXIgPSBmaXJzdFJhbmtlci55b3UgPyBzZWNvbmRSYW5rZXIgOiBmaXJzdFJhbmtlcjtcclxuXHJcblx0XHQvLyBIb3cgbWFueSBtb3JlIHBvaW50cyBkb2VzIHRoZSByYW5rZXIgZ2FpbiBhZ2FpbnN0IGhpcyBwdXJzdWVyLCBldmVyeSBTZWNvbmRcclxuXHRcdGxldCBwb3dlckRpZmYgPSAobGVhZGluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKSAtIChwdXJzdWluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKTtcclxuXHRcdC8vIENhbGN1bGF0ZSB0aGUgbmVlZGVkIFBvaW50IGRpZmZlcmVuY2UsIHRvIGhhdmUgZi5lLiAzMHNlY29uZHMgb2YgcG9pbnQgZ2VuZXJhdGlvbiB3aXRoIHRoZSBkaWZmZXJlbmNlIGluIHBvd2VyXHJcblx0XHRsZXQgbmVlZGVkUG9pbnREaWZmID0gTWF0aC5hYnMocG93ZXJEaWZmICogaW5mb0RhdGEubWFudWFsUHJvbW90ZVdhaXRUaW1lKTtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5tYXgoXHJcblx0XHRcdChsZWFkaW5nUmFua2VyLnlvdSA/IHB1cnN1aW5nUmFua2VyIDogbGVhZGluZ1JhbmtlcikucG9pbnRzICsgbmVlZGVkUG9pbnREaWZmLFxyXG5cdFx0XHRpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblxyXG59XHJcblxyXG5AR2xvYmFsQ29tcG9uZW50XHJcbmNsYXNzIEZhaXJMYWRkZXJWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxMQURERVI+XHJcblx0XHRcdFx0PGEtdGFibGVcclxuXHRcdFx0XHRcdDpjb2x1bW5zPVwiY29sdW1uc1wiXHJcblx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCJ0YWJsZURhdGFcIlxyXG5cdFx0XHRcdFx0c2l6ZT1cInNtYWxsXCJcclxuXHRcdFx0XHRcdDpyb3dDbGFzc05hbWU9XCIocmVjb3JkLCBpbmRleCk9PnJvd0NsYXNzTmFtZShyZWNvcmQpXCJcclxuXHRcdFx0XHRcdDpwYWdpbmF0aW9uPVwicGFnaW5hdGlvblwiXHJcblx0XHRcdFx0XHR0YWJsZUxheW91dD1cImZpeGVkXCJcclxuXHRcdFx0XHRcdD5cclxuXHRcdFx0XHQ8L2EtdGFibGU+XHJcblxyXG5cdFx0XHRcdDxhLWNoZWNrYm94IHYtbW9kZWw6Y2hlY2tlZD1cIm9ubHlNZVwiPiBTaG93IFlvdSA8L2EtY2hlY2tib3g+XHJcblx0XHRcdDwvTEFEREVSPlxyXG5cdFx0YFxyXG5cdH1cclxuXHRvbmx5TWUgPSB0cnVlO1xyXG5cdGdldCBwYWdlU2l6ZSgpIHtcclxuXHRcdHJldHVybiB0aGlzLm5lYXJSYW5rZXJzICogMiArIDE7XHJcblx0fVxyXG5cdG5lYXJSYW5rZXJzID0gNztcclxuXHRnZXQgY29sdW1ucygpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHsgdGl0bGU6ICcjJywgZGF0YUluZGV4OiAncmFuaycgfSxcclxuXHRcdFx0eyB0aXRsZTogJ1VzZXJuYW1lJywgZGF0YUluZGV4OiAndXNlcm5hbWUnIH0sXHJcblx0XHRcdHsgdGl0bGU6ICdQb3dlcicsIGRhdGFJbmRleDogJ3Bvd2VyJyB9LFxyXG5cdFx0XHR7IHRpdGxlOiAnUG9pbnRzJywgZGF0YUluZGV4OiAncG9pbnRzJyB9LFxyXG5cdFx0XTtcclxuXHR9XHJcblx0Z2V0IHRhYmxlRGF0YSgpIHtcclxuXHRcdGlmICh0aGlzLm9ubHlNZSkge1xyXG5cdFx0XHRsZXQgc3RhdGUgPSB0aGlzLmxhZGRlci5zdGF0ZTtcclxuXHRcdFx0bGV0IG1pZGRsZVJhbmsgPSBzdGF0ZS55b3VyUmFua2VyLnJhbms7XHJcblx0XHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1pbihtaWRkbGVSYW5rLCBzdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIHRoaXMubmVhclJhbmtlcnMpO1xyXG5cdFx0XHRtaWRkbGVSYW5rID0gTWF0aC5tYXgobWlkZGxlUmFuaywgdGhpcy5uZWFyUmFua2VycyArIDEpO1xyXG5cdFx0XHRsZXQgcmFua2VycyA9IFtzdGF0ZS5maXJzdFJhbmtlciwgLi4uc3RhdGUucmFua2Vycy5zbGljZShtaWRkbGVSYW5rIC0gdGhpcy5uZWFyUmFua2VycywgbWlkZGxlUmFuayArIHRoaXMubmVhclJhbmtlcnMpXTtcclxuXHRcdFx0cmV0dXJuIHJhbmtlcnM7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUucmFua2VycztcclxuXHR9XHJcblx0Z2V0IHBhZ2luYXRpb24oKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRkZWZhdWx0UGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdGRlZmF1bHRDdXJyZW50OiB+fih0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKSArIDEsXHJcblx0XHRcdGhpZGVPblNpbmdsZVBhZ2U6IHRydWUsXHJcblx0XHR9O1xyXG5cdH1cclxuXHRyb3dDbGFzc05hbWUocmVjb3JkOiBSYW5rZXIpIHtcclxuXHRcdHJldHVybiByZWNvcmQueW91ID8gJ3Jvdy15b3UnIDogJyc7XHJcblx0fVxyXG59Il19