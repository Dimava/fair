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
            middleRank = Math.max(middleRank, this.nearRankers);
            let rankers = [state.firstRanker, ...state.rankers.slice(middleRank - this.nearRankers, middleRank + this.nearRankers)];
            return rankers;
        }
        // return [];
        return this.ladder.state.rankers; //.slice(0, 10);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxNQUFNO0lBQ1gsU0FBUyxHQUFjLENBQUMsQ0FBQztJQUN6QixRQUFRLEdBQVcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFVBQVUsR0FBVyxDQUFDLENBQUM7SUFDdkIsR0FBRyxHQUFZLEtBQUssQ0FBQztJQUNyQixPQUFPLEdBQVksSUFBSSxDQUFDO0lBQ3hCLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsTUFBTSxHQUFXLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQVcsQ0FBQyxDQUFDO0lBRXBCLElBQUksR0FBVyxDQUFDLENBQUM7SUFDakIsV0FBVyxHQUFZLEtBQUssQ0FBQztJQUc3QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQXNDO1FBQ2pELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9B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VTtRQUNiLE9BQU87WUFDTixlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDOUIsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFDekUsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUNELFlBQVksQ0FBQyxNQUFjO1FBQzFCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNELENBQUE7QUFwREE7SUFEQyxXQUFXO3VDQWlCWDtBQXBCSSxhQUFhO0lBRGxCLGVBQWU7R0FDVixhQUFhLENBd0RsQiIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5cclxuXHJcbmNsYXNzIFBsYXllciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRyZXR1cm4gVnVlLnJlYWN0aXZlKHRoaXMpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgUmFua2VyIHtcclxuXHRhY2NvdW50SWQ6IGFjY291bnRJZCA9IDA7XHJcblx0dXNlcm5hbWU6IHN0cmluZyA9ICcnO1xyXG5cdHBvaW50czogbnVtYmVyID0gMDtcclxuXHRwb3dlcjogbnVtYmVyID0gMTtcclxuXHRiaWFzOiBudW1iZXIgPSAwO1xyXG5cdG11bHRpcGxpZXI6IG51bWJlciA9IDE7XHJcblx0eW91OiBib29sZWFuID0gZmFsc2U7XHJcblx0Z3Jvd2luZzogYm9vbGVhbiA9IHRydWU7XHJcblx0dGltZXNBc3Nob2xlOiBudW1iZXIgPSAwO1xyXG5cdGdyYXBlczogbnVtYmVyID0gMDtcclxuXHR2aW5lZ2FyOiBudW1iZXIgPSAwO1xyXG5cclxuXHRyYW5rOiBudW1iZXIgPSAwO1xyXG5cdGF1dG9Qcm9tb3RlOiBib29sZWFuID0gZmFsc2U7XHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRZb3VSYW5rZXIpOiBZb3VSYW5rZXI7XHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRSYW5rZXIpOiBSYW5rZXI7XHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRSYW5rZXIgfCBTb2NrZXRZb3VSYW5rZXIpOiBSYW5rZXIgfCBZb3VSYW5rZXIge1xyXG5cdFx0bGV0IHJhbmtlciA9IHNvdXJjZS55b3UgPyBuZXcgWW91UmFua2VyKCkgOiBuZXcgUmFua2VyKCk7XHJcblx0XHRyYW5rZXIudXNlcm5hbWUgPSBzb3VyY2UudXNlcm5hbWU7XHJcblx0XHRyYW5rZXIueW91ID0gc291cmNlLnlvdTtcclxuXHRcdHJhbmtlci5hY2NvdW50SWQgPSBzb3VyY2UuYWNjb3VudElkO1xyXG5cdFx0cmFua2VyLmJpYXMgPSBzb3VyY2UuYmlhcztcclxuXHRcdHJhbmtlci5ncm93aW5nID0gc291cmNlLmdyb3dpbmc7XHJcblx0XHRyYW5rZXIubXVsdGlwbGllciA9IHNvdXJjZS5tdWx0aXBsaWVyO1xyXG5cdFx0cmFua2VyLnJhbmsgPSBzb3VyY2UucmFuaztcclxuXHRcdHJhbmtlci50aW1lc0Fzc2hvbGUgPSBzb3VyY2UudGltZXNBc3Nob2xlO1xyXG5cdFx0cmFua2VyLnBvaW50cyA9ICtzb3VyY2UucG9pbnRzO1xyXG5cdFx0cmFua2VyLnBvd2VyID0gK3NvdXJjZS5wb3dlcjtcclxuXHRcdGlmIChzb3VyY2UueW91KSB7XHJcblx0XHRcdGxldCB5b3VTb3VyY2UgPSBzb3VyY2UgYXMgU29ja2V0WW91UmFua2VyO1xyXG5cdFx0XHRsZXQgeW91UmFua2VyID0gcmFua2VyIGFzIFlvdVJhbmtlcjtcclxuXHRcdFx0eW91UmFua2VyLmF1dG9Qcm9tb3RlID0geW91U291cmNlLmF1dG9Qcm9tb3RlO1xyXG5cdFx0XHR5b3VSYW5rZXIuZ3JhcGVzID0gK3lvdVNvdXJjZS5ncmFwZXM7XHJcblx0XHRcdHlvdVJhbmtlci52aW5lZ2FyID0gK3lvdVNvdXJjZS52aW5lZ2FyO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJhbmtlcjtcclxuXHR9XHJcbn1cclxuY2xhc3MgWW91UmFua2VyIGV4dGVuZHMgUmFua2VyIHtcclxuXHR5b3UgPSB0cnVlO1xyXG59XHJcblxyXG5jbGFzcyBGYWlyTGFkZGVyIHtcclxuXHRzb2NrZXQ/OiBGYWlyU29ja2V0O1xyXG5cdHVzZXJEYXRhID0gbmV3IFVzZXJEYXRhKCk7XHJcblx0c3RhdGUgPSBWdWVSZWFjdGl2ZSh7XHJcblx0XHRjb25uZWN0ZWQ6IGZhbHNlLFxyXG5cdFx0Y29ubmVjdGlvblJlcXVlc3RlZDogZmFsc2UsXHJcblx0XHRyYW5rZXJzQnlJZDoge30gYXMgUmVjb3JkPG51bWJlciwgUmFua2VyPixcclxuXHRcdGxhZGRlck51bTogMSxcclxuXHJcblx0XHR2aW5lZ2FyZWQ6IHtcclxuXHRcdFx0anVzdFZpbmVnYXJlZDogZmFsc2UsXHJcblx0XHRcdHZpbmVnYXJlZEJ5OiBuZXcgUmFua2VyKCksXHJcblx0XHRcdHZpbmVnYXJUaHJvd246IDAsXHJcblx0XHR9LFxyXG5cclxuXHRcdGN1cnJlbnRMYWRkZXI6IHtcclxuXHRcdFx0bnVtYmVyOiAwLFxyXG5cdFx0fSxcclxuXHRcdHlvdXJSYW5rZXI6IG5ldyBZb3VSYW5rZXIoKSxcclxuXHRcdGZpcnN0UmFua2VyOiBuZXcgUmFua2VyKCksXHJcblx0XHRyYW5rZXJzOiBbbmV3IFJhbmtlcigpXSxcclxuXHRcdHN0YXJ0UmFuazogMCxcclxuXHJcblx0XHRpbmZvRGF0YToge1xyXG5cdFx0XHRwb2ludHNGb3JQcm9tb3RlOiAyNTAwMDAwMDAsXHJcblx0XHRcdG1pbmltdW1QZW9wbGVGb3JQcm9tb3RlOiAxMCxcclxuXHRcdFx0YXNzaG9sZUxhZGRlcjogMTUsXHJcblx0XHRcdGFzc2hvbGVUYWdzOiBbJyddLFxyXG5cdFx0XHRiYXNlVmluZWdhck5lZWRlZFRvVGhyb3c6IDEwMDAwMDAsXHJcblx0XHRcdGJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlOiAyMDAwLFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IDE1LFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogMlxyXG5cdFx0fSxcclxuXHJcblx0XHRwb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlOiAwLFxyXG5cdH0pO1xyXG5cdGxhZGRlclN1YnNjcmlwdGlvbjogYW55O1xyXG5cdGNvbm5lY3QoKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHRocm93IDA7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jb25uZWN0ZWQgfHwgdGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdHRoaXMubGFkZGVyU3Vic2NyaXB0aW9uID0gdGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnN0YXRlLmxhZGRlck51bSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJJbml0KGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2xhZGRlci9pbml0LyRsYWRkZXJOdW0nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5zdGF0ZS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvaW5mbycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlSW5mbyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvaW5mbydcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KVxyXG5cclxuXHR9XHJcblx0ZGlzY29ubmVjdCgpIHtcclxuXHRcdC8vIHRvZG9cclxuXHR9XHJcblxyXG5cclxuXHRoYW5kbGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIobWVzc2FnZS5zZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblxyXG5cdGhhbmRsZUV2ZW50KGV2ZW50OiBTb2NrZXRMYWRkZXJFdmVudCkge1xyXG5cdFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG5cclxuXHRcdHN3aXRjaCAoZXZlbnQuZXZlbnRUeXBlKSB7XHJcblx0XHRcdGNhc2UgJ0JJQVMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuYmlhcysrO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ01VTFRJJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLm11bHRpcGxpZXIrKztcclxuXHRcdFx0XHRyYW5rZXIuYmlhcyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB2aW5lZ2FyVGhyb3duID0gK2V2ZW50LmRhdGEuYW1vdW50O1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgPSAwO1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLmZpcnN0UmFua2VyO1xyXG5cdFx0XHRcdGlmICh0YXJnZXQueW91KSB7XHJcblx0XHRcdFx0XHRpZiAoZXZlbnQuZGF0YS5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3RhdGUudmluZWdhcmVkID0ge1xyXG5cdFx0XHRcdFx0XHRcdGp1c3RWaW5lZ2FyZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0dmluZWdhcmVkQnk6IHJhbmtlcixcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyVGhyb3duLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHQvLyBhbGVydChyYW5rZXIudXNlcm5hbWUgKyBcIiB0aHJldyB0aGVpciBcIlxyXG5cdFx0XHRcdFx0XHQvLyArIG51bWJlckZvcm1hdHRlci5mb3JtYXQodmluZWdhclRocm93bilcclxuXHRcdFx0XHRcdFx0Ly8gKyBcIiBWaW5lZ2FyIGF0IHlvdSBhbmQgbWFkZSB5b3Ugc2xpcCB0byB0aGUgYm90dG9tIG9mIHRoZSBsYWRkZXIuXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0YXJnZXQudmluZWdhciA9IE1hdGgubWF4KDAsIHRhcmdldC52aW5lZ2FyIC0gdmluZWdhclRocm93bik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyb3dpbmcgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50LmFjY291bnRJZCA9PSB0aGlzLnVzZXJEYXRhLmFjY291bnRJZCkge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG5ld0xhZGRlck51bSA9IGxhZGRlckRhdGEuY3VycmVudExhZGRlci5udW1iZXIgKyAxXHJcblx0XHRcdFx0XHQvLyBjaGFuZ2VMYWRkZXIobmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUNoYXRSb29tKG5ld0xhZGRlck51bSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0FVVE9fUFJPTU9URSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5ncmFwZXMgLT0gdGhpcy5nZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rZXIucmFuayk7XHJcblx0XHRcdFx0cmFua2VyLmF1dG9Qcm9tb3RlID0gdHJ1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdKT0lOJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSBuZXcgUmFua2VyKCk7XHJcblx0XHRcdFx0cmFua2VyLmFjY291bnRJZCA9IGV2ZW50LmFjY291bnRJZDtcclxuXHRcdFx0XHRyYW5rZXIudXNlcm5hbWUgPSBldmVudC5kYXRhLnVzZXJuYW1lO1xyXG5cdFx0XHRcdHJhbmtlci5yYW5rID0gdGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCArIDE7XHJcblx0XHRcdFx0aWYgKCF0aGlzLnN0YXRlLnJhbmtlcnMuZmluZChlID0+IGUuYWNjb3VudElkID09IGV2ZW50LmFjY291bnRJZCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vycy5wdXNoKHJhbmtlcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ05BTUVfQ0hBTkdFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gZXZlbnQuZGF0YTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdSRVNFVCc6IHtcclxuXHRcdFx0XHQvLyBkaXNjb25uZWN0IGlzIG1hZGUgYXV0b21hdGljYWxseVxyXG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHJcblx0Z2V0QXV0b1Byb21vdGVHcmFwZUNvc3QocmFuazogbnVtYmVyKSB7XHJcblx0XHRsZXQgaW5mb0RhdGEgPSB0aGlzLnN0YXRlLmluZm9EYXRhO1xyXG5cdFx0bGV0IG1pblBlb3BsZSA9IE1hdGgubWF4KGluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKTtcclxuXHRcdGxldCBkaXZpc29yID0gTWF0aC5tYXgocmFuayAtIG1pblBlb3BsZSArIDEsIDEpO1xyXG5cdFx0cmV0dXJuIE1hdGguZmxvb3IoaW5mb0RhdGEuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUgLyBkaXZpc29yKTtcclxuXHR9XHJcblxyXG5cdGhhbmRsZUluZm8obWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9pbmZvJ10pIHtcclxuXHRcdHRoaXMuc3RhdGUuaW5mb0RhdGEgPSB7XHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IG1lc3NhZ2UuYXNzaG9sZUxhZGRlcixcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IG1lc3NhZ2UuYXNzaG9sZVRhZ3MsXHJcblx0XHRcdGF1dG9Qcm9tb3RlTGFkZGVyOiBtZXNzYWdlLmF1dG9Qcm9tb3RlTGFkZGVyLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogK21lc3NhZ2UuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUsXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogK21lc3NhZ2UuYmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93LFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IG1lc3NhZ2UubWFudWFsUHJvbW90ZVdhaXRUaW1lLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogbWVzc2FnZS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSxcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogK21lc3NhZ2UucG9pbnRzRm9yUHJvbW90ZSxcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZVByaXZhdGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyL3VwZGF0ZXMnXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVMYWRkZXJJbml0KG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyLyddKSB7XHJcblx0XHRpZiAobWVzc2FnZS5zdGF0dXMgPT09IFwiT0tcIikge1xyXG5cdFx0XHRpZiAobWVzc2FnZS5jb250ZW50KSB7XHJcblx0XHRcdFx0bG9jYWxTdG9yYWdlLl9sYWRkZXIgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRMYWRkZXIubnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuc3RhcnRSYW5rID0gbWVzc2FnZS5jb250ZW50LnN0YXJ0UmFuaztcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnMgPSBtZXNzYWdlLmNvbnRlbnQucmFua2Vycy5tYXAoZSA9PiBSYW5rZXIuZnJvbShlKSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzQnlJZCA9IE9iamVjdC5mcm9tRW50cmllcyh0aGlzLnN0YXRlLnJhbmtlcnMubWFwKGUgPT4gW2UuYWNjb3VudElkLCBlXSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUueW91clJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbbWVzc2FnZS5jb250ZW50LnlvdXJSYW5rZXIuYWNjb3VudElkXSBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVMYWRkZXIoc2Vjb25kc1Bhc3NlZDogbnVtYmVyKSB7XHJcblx0XHQvLyBGSVhNRSB0aGlzIHVzZXMgNDAwbXMgcGVyIDhrIHJhbmtlcnNcclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5zb3J0KChhLCBiKSA9PiBiLnBvaW50cyAtIGEucG9pbnRzKTtcclxuXHJcblx0XHRsZXQgbGFkZGVyU3RhdHMgPSB7XHJcblx0XHRcdGdyb3dpbmdSYW5rZXJDb3VudDogMCxcclxuXHRcdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHRcdFx0ZXRhOiAwXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdHJhbmtlci5yYW5rID0gcmFuaztcclxuXHRcdFx0Ly8gSWYgdGhlIHJhbmtlciBpcyBjdXJyZW50bHkgc3RpbGwgb24gbGFkZGVyXHJcblx0XHRcdGlmICghcmFua2VyLmdyb3dpbmcpIHJldHVybjtcclxuXHRcdFx0bGFkZGVyU3RhdHMuZ3Jvd2luZ1JhbmtlckNvdW50ICs9IDE7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBQb2ludHMgJiBQb3dlclxyXG5cdFx0XHRpZiAocmFuayAhPSAxKSB7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyICs9IE1hdGguZmxvb3IoKHJhbmtlci5iaWFzICsgcmFuayAtIDEpICogc2Vjb25kc1Bhc3NlZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmFua2VyLnBvaW50cyArPSBNYXRoLmZsb29yKHJhbmtlci5wb3dlciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cclxuXHJcblx0XHRcdC8vIENhbGN1bGF0aW5nIFZpbmVnYXIgYmFzZWQgb24gR3JhcGVzIGNvdW50XHJcblx0XHRcdGlmIChyYW5rID09IDEpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9PT0gMSlcclxuXHRcdFx0XHRcdHJhbmtlci52aW5lZ2FyICo9IH5+KDAuOTk3NSAqKiBzZWNvbmRzUGFzc2VkKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciArPSB+fihyYW5rZXIuZ3JhcGVzICogc2Vjb25kc1Bhc3NlZClcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGV0IHJhbmtlcnNPbGQgPSB0aGlzLnN0YXRlLnJhbmtlcnMuc2xpY2UoKTtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIucG9pbnRzIC0gYS5wb2ludHMpO1xyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4LCBsaXN0KSA9PiB7XHJcblx0XHRcdGxldCByYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRpZiAocmFuayA9PSByYW5rZXIucmFuaykgcmV0dXJuO1xyXG5cclxuXHRcdFx0aWYgKHJhbmsgPCByYW5rZXIucmFuaykge1xyXG5cdFx0XHRcdC8vIHJhbmsgaW5jcmVhc2UsIGdhaW4gZ3JhcGVzXHJcblx0XHRcdFx0Zm9yIChsZXQgciA9IHJhbmtlci5yYW5rOyByIDwgcmFuazsgcisrKSB7XHJcblx0XHRcdFx0XHQvLyBsZXQgb3RoZXJSYW5rZXIgPSByYW5rZXJzT2xkW3JdO1xyXG5cdFx0XHRcdFx0aWYgKHJhbmtlci5ncm93aW5nICYmIChyYW5rZXIuYmlhcyA+IDAgfHwgcmFua2VyLm11bHRpcGxpZXIgPiAxKSkge1xyXG5cdFx0XHRcdFx0XHRyYW5rZXIuZ3JhcGVzKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyYW5rZXIucmFuayA9IHJhbms7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSYW5rZXIgb24gTGFzdCBQbGFjZSBnYWlucyAxIEdyYXBlLCBvbmx5IGlmIGhlIGlzbid0IHRoZSBvbmx5IG9uZVxyXG5cdFx0aWYgKHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggPj0gTWF0aC5tYXgodGhpcy5zdGF0ZS5pbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcikpIHtcclxuXHRcdFx0bGV0IGxhc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbdGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRpZiAobGFzdFJhbmtlci5ncm93aW5nKSB7XHJcblx0XHRcdFx0bGFzdFJhbmtlci5ncmFwZXMgKz0gfn5zZWNvbmRzUGFzc2VkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR0aGlzLnN0YXRlLmZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzBdO1xyXG5cclxuXHRcdHRoaXMuY2FsY3VsYXRlU3RhdHMoKTtcclxuXHR9XHJcblxyXG5cdGNhbGN1bGF0ZVN0YXRzKCkge1xyXG5cdFx0dGhpcy5zdGF0ZS5wb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlID0gdGhpcy5jYWxjdWxhdGVQb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlKCk7XHJcblx0XHQvLyBcdC8vIEVUQVxyXG5cdFx0Ly8gXHQvLyBUT0RPOiBFVEFcclxuXHR9XHJcblx0Y2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCA8IE1hdGgubWF4KGluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKSkge1xyXG5cdFx0XHRyZXR1cm4gSW5maW5pdHk7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5maXJzdFJhbmtlci5wb2ludHMgPCBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlKSB7XHJcblx0XHRcdHJldHVybiBpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlO1xyXG5cdFx0fVxyXG5cdFx0bGV0IGZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5maXJzdFJhbmtlcjtcclxuXHRcdGxldCBzZWNvbmRSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMV07XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA8IGluZm9EYXRhLmF1dG9Qcm9tb3RlTGFkZGVyKSB7XHJcblx0XHRcdGlmICghZmlyc3RSYW5rZXIueW91KSByZXR1cm4gZmlyc3RSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdFx0cmV0dXJuIHNlY29uZFJhbmtlci5wb2ludHMgKyAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBsZWFkaW5nUmFua2VyID0gZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgcHVyc3VpbmdSYW5rZXIgPSBmaXJzdFJhbmtlci55b3UgPyBzZWNvbmRSYW5rZXIgOiBmaXJzdFJhbmtlcjtcclxuXHJcblx0XHQvLyBIb3cgbWFueSBtb3JlIHBvaW50cyBkb2VzIHRoZSByYW5rZXIgZ2FpbiBhZ2FpbnN0IGhpcyBwdXJzdWVyLCBldmVyeSBTZWNvbmRcclxuXHRcdGxldCBwb3dlckRpZmYgPSAobGVhZGluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKSAtIChwdXJzdWluZ1Jhbmtlci5ncm93aW5nID8gcHVyc3VpbmdSYW5rZXIucG93ZXIgOiAwKTtcclxuXHRcdC8vIENhbGN1bGF0ZSB0aGUgbmVlZGVkIFBvaW50IGRpZmZlcmVuY2UsIHRvIGhhdmUgZi5lLiAzMHNlY29uZHMgb2YgcG9pbnQgZ2VuZXJhdGlvbiB3aXRoIHRoZSBkaWZmZXJlbmNlIGluIHBvd2VyXHJcblx0XHRsZXQgbmVlZGVkUG9pbnREaWZmID0gTWF0aC5hYnMocG93ZXJEaWZmICogaW5mb0RhdGEubWFudWFsUHJvbW90ZVdhaXRUaW1lKTtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5tYXgoXHJcblx0XHRcdChsZWFkaW5nUmFua2VyLnlvdSA/IHB1cnN1aW5nUmFua2VyIDogbGVhZGluZ1JhbmtlcikucG9pbnRzICsgbmVlZGVkUG9pbnREaWZmLFxyXG5cdFx0XHRpbmZvRGF0YS5wb2ludHNGb3JQcm9tb3RlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblxyXG59XHJcblxyXG5AR2xvYmFsQ29tcG9uZW50XHJcbmNsYXNzIEZhaXJMYWRkZXJWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxMQURERVI+XHJcblx0XHRcdFx0PGEtdGFibGVcclxuXHRcdFx0XHRcdDpjb2x1bW5zPVwiY29sdW1uc1wiXHJcblx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCJ0YWJsZURhdGFcIlxyXG5cdFx0XHRcdFx0c2l6ZT1cInNtYWxsXCJcclxuXHRcdFx0XHRcdDpyb3dDbGFzc05hbWU9XCIocmVjb3JkLCBpbmRleCk9PnJvd0NsYXNzTmFtZShyZWNvcmQpXCJcclxuXHRcdFx0XHRcdDpwYWdpbmF0aW9uPVwicGFnaW5hdGlvblwiXHJcblx0XHRcdFx0XHR0YWJsZUxheW91dD1cImZpeGVkXCJcclxuXHRcdFx0XHRcdD5cclxuXHRcdFx0XHQ8L2EtdGFibGU+XHJcblxyXG5cdFx0XHRcdDxhLWNoZWNrYm94IHYtbW9kZWw6Y2hlY2tlZD1cIm9ubHlNZVwiPiBTaG93IFlvdSA8L2EtY2hlY2tib3g+XHJcblx0XHRcdDwvTEFEREVSPlxyXG5cdFx0YFxyXG5cdH1cclxuXHRvbmx5TWUgPSB0cnVlO1xyXG5cdGdldCBwYWdlU2l6ZSgpIHtcclxuXHRcdHJldHVybiB0aGlzLm5lYXJSYW5rZXJzICogMiArIDE7XHJcblx0fVxyXG5cdG5lYXJSYW5rZXJzID0gNztcclxuXHRnZXQgY29sdW1ucygpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHsgdGl0bGU6ICcjJywgZGF0YUluZGV4OiAncmFuaycgfSxcclxuXHRcdFx0eyB0aXRsZTogJ1VzZXJuYW1lJywgZGF0YUluZGV4OiAndXNlcm5hbWUnIH0sXHJcblx0XHRcdHsgdGl0bGU6ICdQb3dlcicsIGRhdGFJbmRleDogJ3Bvd2VyJyB9LFxyXG5cdFx0XHR7IHRpdGxlOiAnUG9pbnRzJywgZGF0YUluZGV4OiAncG9pbnRzJyB9LFxyXG5cdFx0XTtcclxuXHR9XHJcblx0Z2V0IHRhYmxlRGF0YSgpIHtcclxuXHRcdGlmICh0aGlzLm9ubHlNZSkge1xyXG5cdFx0XHRsZXQgc3RhdGUgPSB0aGlzLmxhZGRlci5zdGF0ZTtcclxuXHRcdFx0bGV0IG1pZGRsZVJhbmsgPSBzdGF0ZS55b3VyUmFua2VyLnJhbms7XHJcblx0XHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1pbihtaWRkbGVSYW5rLCBzdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIHRoaXMubmVhclJhbmtlcnMpO1xyXG5cdFx0XHRtaWRkbGVSYW5rID0gTWF0aC5tYXgobWlkZGxlUmFuaywgdGhpcy5uZWFyUmFua2Vycyk7XHJcblx0XHRcdGxldCByYW5rZXJzID0gW3N0YXRlLmZpcnN0UmFua2VyLCAuLi5zdGF0ZS5yYW5rZXJzLnNsaWNlKG1pZGRsZVJhbmsgLSB0aGlzLm5lYXJSYW5rZXJzLCBtaWRkbGVSYW5rICsgdGhpcy5uZWFyUmFua2VycyldO1xyXG5cdFx0XHRyZXR1cm4gcmFua2VycztcclxuXHRcdH1cclxuXHRcdC8vIHJldHVybiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmxhZGRlci5zdGF0ZS5yYW5rZXJzLy8uc2xpY2UoMCwgMTApO1xyXG5cdH1cclxuXHRnZXQgcGFnaW5hdGlvbigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGRlZmF1bHRQYWdlU2l6ZTogdGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0ZGVmYXVsdEN1cnJlbnQ6IH5+KHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucmFuayAvIHRoaXMucGFnZVNpemUpICsgMSxcclxuXHRcdFx0aGlkZU9uU2luZ2xlUGFnZTogdHJ1ZSxcclxuXHRcdH07XHJcblx0fVxyXG5cdHJvd0NsYXNzTmFtZShyZWNvcmQ6IFJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHJlY29yZC55b3UgPyAncm93LXlvdScgOiAnJztcclxuXHR9XHJcbn0iXX0=