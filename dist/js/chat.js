"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class ChatMessage {
    username = "Chad, the Listener";
    message = "Sorry, I'm currently resting my ears. If you want to be heard, head over into our Discord. https://discord.gg/Ud7UfFJmYj ";
    timesAsshole = 0;
    accountId = 0;
    timeCreated = "00:00";
}
class FairChat {
    socket;
    userData = new UserData();
    state = Vue.reactive({
        connected: false,
        connectionRequested: false,
        currentChatNumber: -1,
        messages: [new ChatMessage()],
        loading: false,
    });
    chatSubscription;
    constructor() {
        return Vue.markRaw(this);
    }
    connect() {
        if (!this.socket)
            throw 0;
        if (!this.userData.uuid)
            throw 0;
        if (this.state.connected || this.state.connectionRequested)
            throw 0;
        this.state.connectionRequested = true;
        let resolveConnected;
        this.chatSubscription = this.socket.subscribe('/topic/chat/$ladderNum', (data) => {
            this.handleChatUpdates(data);
        }, { uuid: this.userData.uuid }, this.userData.chatNum);
        this.socket.subscribe('/user/queue/chat/', (data) => {
            this.handleChatInit(data);
            resolveConnected();
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, this.userData.chatNum);
        return new Promise(resolve => { resolveConnected = resolve; });
    }
    handleChatUpdates(message) {
        if (!message)
            return;
        message.username = unescapeHtml(message.username);
        message.message = unescapeHtml(message.message);
        this.state.messages.unshift(Object.assign(new ChatMessage(), message));
        this.state.loading = false;
        // if (chatData.messages.length > 30) chatData.messages.pop();
    }
    handleChatInit(message) {
        if (message.status === "OK") {
            if (message.content) {
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.state.currentChatNumber = message.content.currentChatNumber;
                this.state.messages = message.content.messages.map(e => Object.assign(new ChatMessage, e));
                antd.message.success(`Connected to Chad#${message.content.currentChatNumber} !`, 10);
            }
        }
    }
    sendMessage(message) {
        if (!this.socket)
            throw 0;
        if (message == "")
            return;
        message = message.slice(0, 280);
        this.socket.send('/app/chat/post/$currentChatNumber', {
            uuid: this.userData.uuid,
            content: message,
        }, this.state.currentChatNumber);
    }
    // function changeChatRoom(ladderNum) {
    //     chatSubscription.unsubscribe();
    //     chatSubscription = stompClient.subscribe('/topic/chat/' + ladderNum,
    //         (message) => handleChatUpdates(JSON.parse(message.body)), {uuid: getCookie("_uuid")});
    //     initChat(ladderNum);
    // }
    // function updateChatUsername(event) {
    //     chatData.messages.forEach(message => {
    //         if (event.accountId === message.accountId) {
    //             message.username = event.data;
    //         }
    //     })
    //     updateChat();
    // }
    changeUsername(newUsername) {
        newUsername = newUsername.slice(0, 32);
        if (!newUsername)
            return false;
        if (!newUsername.trim())
            return false;
        if (newUsername == this.userData.username)
            return false;
        this.socket?.send('/app/account/name', {
            uuid: this.userData.uuid,
            content: newUsername,
        });
        this.userData.username = newUsername;
        return true;
    }
}
let FairChatVue = class FairChatVue extends VueWithProps({
    chat: FairChat,
    ladder: FairLadder,
}) {
    newMessage = '';
    loading = false;
    newUsernameModalOpen = false;
    newUsername = '';
    get _t() {
        let message = this.chat.state.messages[0];
        let a = new Ranker(); // this.extractMentions(message)[0];
        let r = this.ladder.state.rankersById[0];
        return `
			<CHAT>
				<a-list
						class="fair-chat"
						:data-source="${this.chat.state.messages}"
						size="small" bordered
						>
					<template #header>
						<h2>Welcome to the Chad#{${this.chat.state.currentChatNumber}} !</h2>
					</template>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(message.timesAsshole)}}</b></template>
								<template #author><b>{${message.username}}</b></template>
								<template #content>
									<p>
										<template v-for="a of ${this.extractMentions(message)}">
											<template v-if="${typeof a == 'string'}">{${a}}</template>
											<span v-else
												class="chat-mention"
												>@{${a.username}}<sup
													>#{${a.interpolated.rank + (a.growing ? '' : '^')}}</sup></span>
										</template>
									</p>
								</template>
								<template #datetime>{${message.timeCreated}}</template>
							</a-comment>
						</a-list-item>
					</template>
				</a-list>
				<a-list
						class="fair-chat-new"
						:data-source="${[1]}"
						size="small" bordered
						item-layout="vertical"
						>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(123)}}</b></template>
								<template #author>
									{${this.chat.userData.username}}
									<span @click="${this.changeUsername()}">🖉</span>
								</template>
								<template #content>

									<a-mentions
										v-model:value="${this.newMessage}"
										placeholder="Chad mentions is listening..."
										@search="${this.updatePossibleMentions}"
										@keyup.enter.prevent="${this.sendMessage()}"
										>
										<a-mentions-option
											v-for="r in ${this.possibleMentions}"
											:value="${r.username + '#' + r.accountId}"
											>
											<div
												:class="${{ 'mention-not-chatting': !this.chatMessageCounts[r.accountId] }}"
												>
												<b>{${this.assholeMark(r.timesAsshole)}}</b>
												{${r.username}} [{{this.chatMessageCounts[r.accountId]}}]
												<sup>#{${r.interpolated.rank + (r.growing ? '' : '^')}}</sup>
											</div>
										</a-mentions-option>
									</a-mentions>
									<a-button type="primary" @click="${this.sendMessage()}"> Send </a-button>

									<a-input-search v-if="0"
											v-model:value="${this.newMessage}"
											placeholder="Chad is listening..."
											@search="${this.sendMessage()}"
											:loading="${this.chat.state.loading}"
											enter-button="Send"
											/>
								</template>
							</a-comment>
						</a-list-item>
					</template>
				</a-list>
				<a-modal
						v-model:visible="${this.newUsernameModalOpen}"
						title="What shall be your new name?"
						@ok="${this.confirmNameChange()}"
						>
					<a-input ref="elNewUsernameInput" v-model:value="${this.newUsername}" @pressEnter="${this.confirmNameChange()}" maxlength="32" />
				</a-modal>
			</CHAT>
		`;
    }
    assholeMark(n) {
        if (n == 0)
            return '@';
        const marks = ["@", "♠", "♣", "♥", "♦"];
        return marks[n] || marks.pop();
    }
    htmlToText(s) {
        let a = document.createElement('a');
        a.innerHTML = s;
        return a.innerText;
    }
    possibleMentions = [new Ranker()];
    chatMessageCounts = {};
    updatePossibleMentions(s) {
        let rankers = Object.values(this.ladder.state.rankersById);
        let counts = Vue.toRaw(this.chat.state.messages).map(e => e.accountId).reduce((v, e) => (v[e] ??= 0, v[e]++, v), {});
        this.chatMessageCounts = counts;
        rankers.sort((a, b) => (counts[b.accountId] ?? 0) - (counts[a.accountId] ?? 0));
        return this.possibleMentions = rankers.filter(e => e.username.startsWith(s)).slice(0, 8);
    }
    extractMentions(message) {
        let s = this.htmlToText(message.message);
        let rankers = Object.values(Vue.toRaw(this.ladder.state.rankersById));
        let rpl = (r) => [
            `@${r.username}#${r.accountId}`, `<@#${r.accountId}>`,
            `@${r.username}`, `<@#${r.accountId}>`,
            `@#${r.accountId}`, `<@#${r.accountId}>`,
            `<<@#${r.accountId}>>`, `<@#${r.accountId}>`,
        ];
        for (let i = 0; i < 4; i++) {
            for (let r of rankers) {
                let [p, l] = rpl(r);
                if (s.includes(p)) {
                    console.log({ s, p, l, r });
                    s = s.replace(p, l);
                }
            }
        }
        Object.assign(globalThis, { _cv: this });
        return s.match(/<@#\d+>|((?!<@#\d+>)[^])+/g).map(e => {
            let m1 = e.match(/<@#(\d+)>/);
            if (!m1)
                return e;
            return this.ladder.state.rankersById[+m1[1]] ?? new Ranker();
            ;
        });
        // let matches = s.match(/@[^@#]{0,32}#\d+|[^@]+/) ?? [];
        // return matches.flatMap(m => {
        // 	if (!m.startsWith('@')) return [m];
        // 	let [_, name, id] = m.split(/@#/);
        // 	if (!id) return
        // });
    }
    async sendMessage() {
        this.chat.state.loading = true;
        await new Promise(r => setTimeout(r, 400));
        this.chat.sendMessage(this.newMessage);
        while (this.chat.state.loading) {
            await new Promise(r => setTimeout(r, 100));
        }
        this.newMessage = '';
    }
    changeUsername() {
        this.newUsername = this.chat.userData.username;
        this.newUsernameModalOpen = true;
        setTimeout(() => {
            let input = this.$refs.elNewUsernameInput;
            input?.focus();
        });
    }
    confirmNameChange() {
        this.newUsernameModalOpen = false;
        this.chat.changeUsername(this.newUsername);
    }
};
__decorate([
    VueTemplate
], FairChatVue.prototype, "_t", null);
FairChatVue = __decorate([
    GlobalComponent
], FairChatVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxNQUFNLFdBQVc7SUFDaEIsUUFBUSxHQUFXLG9CQUFvQixDQUFDO0lBQ3hDLE9BQU8sR0FBVywySEFBMkgsQ0FBQztJQUM5SSxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsV0FBVyxHQUFXLE9BQU8sQ0FBQztDQUM5QjtBQUtELE1BQU0sUUFBUTtJQUNiLE1BQU0sQ0FBYztJQUVwQixRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztJQUMxQixLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUNwQixTQUFTLEVBQUUsS0FBSztRQUNoQixtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNyQixRQUFRLEVBQUUsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQzdCLE9BQU8sRUFBRSxLQUFLO0tBQ2QsQ0FBQyxDQUFDO0lBRUgsZ0JBQWdCLENBQTZCO0lBQzdDO1FBQ0MsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7WUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUN0QyxJQUFJLGdCQUE0QixDQUFDO1FBRWpDLElBQUksQ0FBQyxnQkFBZ0IsR0FB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LG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUNqQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBc0MsQ0FBQztZQUM5RCxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBdEtBO0lBREMsV0FBVztxQ0E4Rlg7QUF4R0ksV0FBVztJQURoQixlQUFlO0dBQ1YsV0FBVyxDQWlMaEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbmNsYXNzIENoYXRNZXNzYWdlIHtcclxuXHR1c2VybmFtZTogc3RyaW5nID0gXCJDaGFkLCB0aGUgTGlzdGVuZXJcIjtcclxuXHRtZXNzYWdlOiBzdHJpbmcgPSBcIlNvcnJ5LCBJJ20gY3VycmVudGx5IHJlc3RpbmcgbXkgZWFycy4gSWYgeW91IHdhbnQgdG8gYmUgaGVhcmQsIGhlYWQgb3ZlciBpbnRvIG91ciBEaXNjb3JkLiBodHRwczovL2Rpc2NvcmQuZ2cvVWQ3VWZGSm1ZaiBcIjtcclxuXHR0aW1lc0Fzc2hvbGU6IG51bWJlciA9IDA7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHRpbWVDcmVhdGVkOiBzdHJpbmcgPSBcIjAwOjAwXCI7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmNsYXNzIEZhaXJDaGF0IHtcclxuXHRzb2NrZXQ/OiBGYWlyU29ja2V0O1xyXG5cclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlLnJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdGN1cnJlbnRDaGF0TnVtYmVyOiAtMSxcclxuXHRcdG1lc3NhZ2VzOiBbbmV3IENoYXRNZXNzYWdlKCldLFxyXG5cdFx0bG9hZGluZzogZmFsc2UsXHJcblx0fSk7XHJcblxyXG5cdGNoYXRTdWJzY3JpcHRpb24/OiBTdG9tcEpzLlN0b21wU3Vic2NyaXB0aW9uO1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5tYXJrUmF3KHRoaXMpO1xyXG5cdH1cclxuXHRjb25uZWN0KCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB0aHJvdyAwO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY29ubmVjdGVkIHx8IHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCkgdGhyb3cgMDtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRsZXQgcmVzb2x2ZUNvbm5lY3RlZDogKCkgPT4gdm9pZDtcclxuXHJcblx0XHR0aGlzLmNoYXRTdWJzY3JpcHRpb24gPSB0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy51c2VyRGF0YS5jaGF0TnVtKTtcclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvY2hhdC8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRJbml0KGRhdGEpO1xyXG5cdFx0XHRyZXNvbHZlQ29ubmVjdGVkKCk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvY2hhdC9pbml0LyRsYWRkZXJOdW0nLCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnVzZXJEYXRhLmNoYXROdW0pO1xyXG5cclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHsgcmVzb2x2ZUNvbm5lY3RlZCA9IHJlc29sdmU7IH0pO1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUNoYXRVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2NoYXQvJGxhZGRlck51bSddKSB7XHJcblx0XHRpZiAoIW1lc3NhZ2UpIHJldHVybjtcclxuXHRcdG1lc3NhZ2UudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS51c2VybmFtZSk7XHJcblx0XHRtZXNzYWdlLm1lc3NhZ2UgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS5tZXNzYWdlKTtcclxuXHRcdHRoaXMuc3RhdGUubWVzc2FnZXMudW5zaGlmdChPYmplY3QuYXNzaWduKG5ldyBDaGF0TWVzc2FnZSgpLCBtZXNzYWdlKSk7XHJcblx0XHR0aGlzLnN0YXRlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdC8vIGlmIChjaGF0RGF0YS5tZXNzYWdlcy5sZW5ndGggPiAzMCkgY2hhdERhdGEubWVzc2FnZXMucG9wKCk7XHJcblx0fVxyXG5cdGhhbmRsZUNoYXRJbml0KG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvY2hhdC8nXSkge1xyXG5cdFx0aWYgKG1lc3NhZ2Uuc3RhdHVzID09PSBcIk9LXCIpIHtcclxuXHRcdFx0aWYgKG1lc3NhZ2UuY29udGVudCkge1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmN1cnJlbnRDaGF0TnVtYmVyID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRDaGF0TnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUubWVzc2FnZXMgPSBtZXNzYWdlLmNvbnRlbnQubWVzc2FnZXMubWFwKGUgPT4gT2JqZWN0LmFzc2lnbihuZXcgQ2hhdE1lc3NhZ2UsIGUpKTtcclxuXHJcblx0XHRcdFx0YW50ZC5tZXNzYWdlLnN1Y2Nlc3MoXHJcblx0XHRcdFx0XHRgQ29ubmVjdGVkIHRvIENoYWQjJHttZXNzYWdlLmNvbnRlbnQuY3VycmVudENoYXROdW1iZXJ9ICFgLFxyXG5cdFx0XHRcdFx0MTAsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2VuZE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKG1lc3NhZ2UgPT0gXCJcIikgcmV0dXJuO1xyXG5cclxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnNsaWNlKDAsIDI4MCk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9jaGF0L3Bvc3QvJGN1cnJlbnRDaGF0TnVtYmVyJywge1xyXG5cdFx0XHR1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQsXHJcblx0XHRcdGNvbnRlbnQ6IG1lc3NhZ2UsXHJcblx0XHR9LCB0aGlzLnN0YXRlLmN1cnJlbnRDaGF0TnVtYmVyKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBmdW5jdGlvbiBjaGFuZ2VDaGF0Um9vbShsYWRkZXJOdW0pIHtcclxuXHQvLyAgICAgY2hhdFN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xyXG5cdC8vICAgICBjaGF0U3Vic2NyaXB0aW9uID0gc3RvbXBDbGllbnQuc3Vic2NyaWJlKCcvdG9waWMvY2hhdC8nICsgbGFkZGVyTnVtLFxyXG5cdC8vICAgICAgICAgKG1lc3NhZ2UpID0+IGhhbmRsZUNoYXRVcGRhdGVzKEpTT04ucGFyc2UobWVzc2FnZS5ib2R5KSksIHt1dWlkOiBnZXRDb29raWUoXCJfdXVpZFwiKX0pO1xyXG5cdC8vICAgICBpbml0Q2hhdChsYWRkZXJOdW0pO1xyXG5cdC8vIH1cclxuXHJcblx0Ly8gZnVuY3Rpb24gdXBkYXRlQ2hhdFVzZXJuYW1lKGV2ZW50KSB7XHJcblx0Ly8gICAgIGNoYXREYXRhLm1lc3NhZ2VzLmZvckVhY2gobWVzc2FnZSA9PiB7XHJcblx0Ly8gICAgICAgICBpZiAoZXZlbnQuYWNjb3VudElkID09PSBtZXNzYWdlLmFjY291bnRJZCkge1xyXG5cdC8vICAgICAgICAgICAgIG1lc3NhZ2UudXNlcm5hbWUgPSBldmVudC5kYXRhO1xyXG5cdC8vICAgICAgICAgfVxyXG5cdC8vICAgICB9KVxyXG5cdC8vICAgICB1cGRhdGVDaGF0KCk7XHJcblx0Ly8gfVxyXG5cdGNoYW5nZVVzZXJuYW1lKG5ld1VzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdG5ld1VzZXJuYW1lID0gbmV3VXNlcm5hbWUuc2xpY2UoMCwgMzIpO1xyXG5cdFx0aWYgKCFuZXdVc2VybmFtZSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKCFuZXdVc2VybmFtZS50cmltKCkpIHJldHVybiBmYWxzZTtcclxuXHRcdGlmIChuZXdVc2VybmFtZSA9PSB0aGlzLnVzZXJEYXRhLnVzZXJuYW1lKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0aGlzLnNvY2tldD8uc2VuZCgnL2FwcC9hY2NvdW50L25hbWUnLCB7XHJcblx0XHRcdHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCxcclxuXHRcdFx0Y29udGVudDogbmV3VXNlcm5hbWUsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMudXNlckRhdGEudXNlcm5hbWUgPSBuZXdVc2VybmFtZTtcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcbkBHbG9iYWxDb21wb25lbnRcclxuY2xhc3MgRmFpckNoYXRWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGNoYXQ6IEZhaXJDaGF0LFxyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdG5ld01lc3NhZ2UgPSAnJztcclxuXHRsb2FkaW5nID0gZmFsc2U7XHJcblxyXG5cdG5ld1VzZXJuYW1lTW9kYWxPcGVuID0gZmFsc2U7XHJcblx0bmV3VXNlcm5hbWUgPSAnJztcclxuXHJcblx0QFZ1ZVRlbXBsYXRlXHJcblx0Z2V0IF90KCkge1xyXG5cdFx0bGV0IG1lc3NhZ2UgPSB0aGlzLmNoYXQuc3RhdGUubWVzc2FnZXNbMF07XHJcblx0XHRsZXQgYSA9IG5ldyBSYW5rZXIoKTsgLy8gdGhpcy5leHRyYWN0TWVudGlvbnMobWVzc2FnZSlbMF07XHJcblx0XHRsZXQgciA9IHRoaXMubGFkZGVyLnN0YXRlLnJhbmtlcnNCeUlkWzBdO1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PENIQVQ+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdFwiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cIiR7dGhpcy5jaGF0LnN0YXRlLm1lc3NhZ2VzfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiIGJvcmRlcmVkXHJcblx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjaGVhZGVyPlxyXG5cdFx0XHRcdFx0XHQ8aDI+V2VsY29tZSB0byB0aGUgQ2hhZCN7JHt0aGlzLmNoYXQuc3RhdGUuY3VycmVudENoYXROdW1iZXJ9fSAhPC9oMj5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsobWVzc2FnZS50aW1lc0Fzc2hvbGUpfX08L2I+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXV0aG9yPjxiPnske21lc3NhZ2UudXNlcm5hbWV9fTwvYj48L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNjb250ZW50PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8cD5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1mb3I9XCJhIG9mICR7dGhpcy5leHRyYWN0TWVudGlvbnMobWVzc2FnZSl9XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cIiR7dHlwZW9mIGEgPT0gJ3N0cmluZyd9XCI+eyR7YX19PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIHYtZWxzZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjbGFzcz1cImNoYXQtbWVudGlvblwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD5AeyR7YS51c2VybmFtZX19PHN1cFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD4jeyR7YS5pbnRlcnBvbGF0ZWQucmFuayArIChhLmdyb3dpbmcgPyAnJyA6ICdeJyl9fTwvc3VwPjwvc3Bhbj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8L3A+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNkYXRldGltZT57JHttZXNzYWdlLnRpbWVDcmVhdGVkfX08L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb21tZW50PlxyXG5cdFx0XHRcdFx0XHQ8L2EtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtbGlzdD5cclxuXHRcdFx0XHQ8YS1saXN0XHJcblx0XHRcdFx0XHRcdGNsYXNzPVwiZmFpci1jaGF0LW5ld1wiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cIiR7WzFdfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiIGJvcmRlcmVkXHJcblx0XHRcdFx0XHRcdGl0ZW0tbGF5b3V0PVwidmVydGljYWxcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsoMTIzKX19PC9iPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F1dGhvcj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0eyR7dGhpcy5jaGF0LnVzZXJEYXRhLnVzZXJuYW1lfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gQGNsaWNrPVwiJHt0aGlzLmNoYW5nZVVzZXJuYW1lKCl9XCI+8J+WiTwvc3Bhbj5cclxuXHRcdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2NvbnRlbnQ+XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8YS1tZW50aW9uc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHYtbW9kZWw6dmFsdWU9XCIke3RoaXMubmV3TWVzc2FnZX1cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwiQ2hhZCBtZW50aW9ucyBpcyBsaXN0ZW5pbmcuLi5cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEBzZWFyY2g9XCIke3RoaXMudXBkYXRlUG9zc2libGVNZW50aW9uc31cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEBrZXl1cC5lbnRlci5wcmV2ZW50PVwiJHt0aGlzLnNlbmRNZXNzYWdlKCl9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGEtbWVudGlvbnMtb3B0aW9uXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2LWZvcj1cInIgaW4gJHt0aGlzLnBvc3NpYmxlTWVudGlvbnN9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDp2YWx1ZT1cIiR7ci51c2VybmFtZSArICcjJyArIHIuYWNjb3VudElkfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDpjbGFzcz1cIiR7eyAnbWVudGlvbi1ub3QtY2hhdHRpbmcnOiAhdGhpcy5jaGF0TWVzc2FnZUNvdW50c1tyLmFjY291bnRJZF0gfX1cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxiPnske3RoaXMuYXNzaG9sZU1hcmsoci50aW1lc0Fzc2hvbGUpfX08L2I+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHske3IudXNlcm5hbWV9fSBbe3t0aGlzLmNoYXRNZXNzYWdlQ291bnRzW3IuYWNjb3VudElkXX19XVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ8c3VwPiN7JHtyLmludGVycG9sYXRlZC5yYW5rICsgKHIuZ3Jvd2luZyA/ICcnIDogJ14nKX19PC9zdXA+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8L2EtbWVudGlvbnMtb3B0aW9uPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2EtbWVudGlvbnM+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxhLWJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIEBjbGljaz1cIiR7dGhpcy5zZW5kTWVzc2FnZSgpfVwiPiBTZW5kIDwvYS1idXR0b24+XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8YS1pbnB1dC1zZWFyY2ggdi1pZj1cIjBcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0di1tb2RlbDp2YWx1ZT1cIiR7dGhpcy5uZXdNZXNzYWdlfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIkNoYWQgaXMgbGlzdGVuaW5nLi4uXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdEBzZWFyY2g9XCIke3RoaXMuc2VuZE1lc3NhZ2UoKX1cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbnRlci1idXR0b249XCJTZW5kXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb21tZW50PlxyXG5cdFx0XHRcdFx0XHQ8L2EtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtbGlzdD5cclxuXHRcdFx0XHQ8YS1tb2RhbFxyXG5cdFx0XHRcdFx0XHR2LW1vZGVsOnZpc2libGU9XCIke3RoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW59XCJcclxuXHRcdFx0XHRcdFx0dGl0bGU9XCJXaGF0IHNoYWxsIGJlIHlvdXIgbmV3IG5hbWU/XCJcclxuXHRcdFx0XHRcdFx0QG9rPVwiJHt0aGlzLmNvbmZpcm1OYW1lQ2hhbmdlKCl9XCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0PGEtaW5wdXQgcmVmPVwiZWxOZXdVc2VybmFtZUlucHV0XCIgdi1tb2RlbDp2YWx1ZT1cIiR7dGhpcy5uZXdVc2VybmFtZX1cIiBAcHJlc3NFbnRlcj1cIiR7dGhpcy5jb25maXJtTmFtZUNoYW5nZSgpfVwiIG1heGxlbmd0aD1cIjMyXCIgLz5cclxuXHRcdFx0XHQ8L2EtbW9kYWw+XHJcblx0XHRcdDwvQ0hBVD5cclxuXHRcdGA7XHJcblx0fVxyXG5cdGFzc2hvbGVNYXJrKG46IG51bWJlcikge1xyXG5cdFx0aWYgKG4gPT0gMCkgcmV0dXJuICdAJztcclxuXHRcdGNvbnN0IG1hcmtzID0gW1wiQFwiLCBcIuKZoFwiLCBcIuKZo1wiLCBcIuKZpVwiLCBcIuKZplwiXTtcclxuXHRcdHJldHVybiBtYXJrc1tuXSB8fCBtYXJrcy5wb3AoKTtcclxuXHR9XHJcblx0aHRtbFRvVGV4dChzOiBzdHJpbmcpIHtcclxuXHRcdGxldCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG5cdFx0YS5pbm5lckhUTUwgPSBzO1xyXG5cdFx0cmV0dXJuIGEuaW5uZXJUZXh0O1xyXG5cdH1cclxuXHRwb3NzaWJsZU1lbnRpb25zID0gW25ldyBSYW5rZXIoKV07XHJcblx0Y2hhdE1lc3NhZ2VDb3VudHMgPSB7fSBhcyBSZWNvcmQ8YWNjb3VudElkLCBudW1iZXI+XHJcblx0dXBkYXRlUG9zc2libGVNZW50aW9ucyhzOiBzdHJpbmcpIHtcclxuXHRcdGxldCByYW5rZXJzID0gT2JqZWN0LnZhbHVlcyh0aGlzLmxhZGRlci5zdGF0ZS5yYW5rZXJzQnlJZCk7XHJcblx0XHRsZXQgY291bnRzID0gVnVlLnRvUmF3KHRoaXMuY2hhdC5zdGF0ZS5tZXNzYWdlcykubWFwKGUgPT4gZS5hY2NvdW50SWQpLnJlZHVjZSgodiwgZSkgPT4gKHZbZV0gPz89IDAsIHZbZV0rKywgdiksIHt9IGFzIFJlY29yZDxhY2NvdW50SWQsIG51bWJlcj4pO1xyXG5cdFx0dGhpcy5jaGF0TWVzc2FnZUNvdW50cyA9IGNvdW50cztcclxuXHRcdHJhbmtlcnMuc29ydCgoYSwgYikgPT4gKGNvdW50c1tiLmFjY291bnRJZF0gPz8gMCkgLSAoY291bnRzW2EuYWNjb3VudElkXSA/PyAwKSk7XHJcblx0XHRyZXR1cm4gdGhpcy5wb3NzaWJsZU1lbnRpb25zID0gcmFua2Vycy5maWx0ZXIoZSA9PiBlLnVzZXJuYW1lLnN0YXJ0c1dpdGgocykpLnNsaWNlKDAsIDgpO1xyXG5cdH1cclxuXHRleHRyYWN0TWVudGlvbnMobWVzc2FnZTogQ2hhdE1lc3NhZ2UpIHtcclxuXHRcdGxldCBzID0gdGhpcy5odG1sVG9UZXh0KG1lc3NhZ2UubWVzc2FnZSk7XHJcblx0XHRsZXQgcmFua2VycyA9IE9iamVjdC52YWx1ZXMoVnVlLnRvUmF3KHRoaXMubGFkZGVyLnN0YXRlLnJhbmtlcnNCeUlkKSk7XHJcblx0XHRsZXQgcnBsID0gKHI6IFJhbmtlcikgPT4gW1xyXG5cdFx0XHRgQCR7ci51c2VybmFtZX0jJHtyLmFjY291bnRJZH1gLCBgPEAjJHtyLmFjY291bnRJZH0+YCxcclxuXHRcdFx0YEAke3IudXNlcm5hbWV9YCwgYDxAIyR7ci5hY2NvdW50SWR9PmAsXHJcblx0XHRcdGBAIyR7ci5hY2NvdW50SWR9YCwgYDxAIyR7ci5hY2NvdW50SWR9PmAsXHJcblx0XHRcdGA8PEAjJHtyLmFjY291bnRJZH0+PmAsIGA8QCMke3IuYWNjb3VudElkfT5gLFxyXG5cdFx0XVxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcclxuXHRcdFx0Zm9yIChsZXQgciBvZiByYW5rZXJzKSB7XHJcblx0XHRcdFx0bGV0IFtwLCBsXSA9IHJwbChyKTtcclxuXHRcdFx0XHRpZiAocy5pbmNsdWRlcyhwKSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coe3MsIHAsIGwsIHJ9KTtcclxuXHRcdFx0XHRcdHMgPSBzLnJlcGxhY2UocCwgbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0T2JqZWN0LmFzc2lnbihnbG9iYWxUaGlzLCB7IF9jdjogdGhpcyB9KTtcclxuXHRcdHJldHVybiBzLm1hdGNoKC88QCNcXGQrPnwoKD8hPEAjXFxkKz4pW15dKSsvZykhLm1hcChlID0+IHtcclxuXHRcdFx0bGV0IG0xID0gZS5tYXRjaCgvPEAjKFxcZCspPi8pO1xyXG5cdFx0XHRpZiAoIW0xKSByZXR1cm4gZTtcclxuXHRcdFx0cmV0dXJuIHRoaXMubGFkZGVyLnN0YXRlLnJhbmtlcnNCeUlkWyttMVsxXV0gPz8gbmV3IFJhbmtlcigpOztcclxuXHRcdH0pO1xyXG5cdFx0Ly8gbGV0IG1hdGNoZXMgPSBzLm1hdGNoKC9AW15AI117MCwzMn0jXFxkK3xbXkBdKy8pID8/IFtdO1xyXG5cdFx0Ly8gcmV0dXJuIG1hdGNoZXMuZmxhdE1hcChtID0+IHtcclxuXHRcdC8vIFx0aWYgKCFtLnN0YXJ0c1dpdGgoJ0AnKSkgcmV0dXJuIFttXTtcclxuXHRcdC8vIFx0bGV0IFtfLCBuYW1lLCBpZF0gPSBtLnNwbGl0KC9AIy8pO1xyXG5cdFx0Ly8gXHRpZiAoIWlkKSByZXR1cm5cclxuXHRcdC8vIH0pO1xyXG5cdH1cclxuXHRhc3luYyBzZW5kTWVzc2FnZSgpIHtcclxuXHRcdHRoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA0MDApKTtcclxuXHRcdHRoaXMuY2hhdC5zZW5kTWVzc2FnZSh0aGlzLm5ld01lc3NhZ2UpO1xyXG5cdFx0d2hpbGUgKHRoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nKSB7XHJcblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDApKTtcclxuXHRcdH1cclxuXHRcdHRoaXMubmV3TWVzc2FnZSA9ICcnO1xyXG5cdH1cclxuXHRjaGFuZ2VVc2VybmFtZSgpIHtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWUgPSB0aGlzLmNoYXQudXNlckRhdGEudXNlcm5hbWU7XHJcblx0XHR0aGlzLm5ld1VzZXJuYW1lTW9kYWxPcGVuID0gdHJ1ZTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRsZXQgaW5wdXQgPSB0aGlzLiRyZWZzLmVsTmV3VXNlcm5hbWVJbnB1dCBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdFx0XHRpbnB1dD8uZm9jdXMoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRjb25maXJtTmFtZUNoYW5nZSgpIHtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW4gPSBmYWxzZTtcclxuXHRcdHRoaXMuY2hhdC5jaGFuZ2VVc2VybmFtZSh0aGlzLm5ld1VzZXJuYW1lKTtcclxuXHR9XHJcbn0iXX0=