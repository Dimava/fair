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
        this.state.messages.unshift(message);
        this.state.loading = false;
        // if (chatData.messages.length > 30) chatData.messages.pop();
    }
    handleChatInit(message) {
        if (message.status === "OK") {
            if (message.content) {
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.state.currentChatNumber = message.content.currentChatNumber;
                this.state.messages = message.content.messages;
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
}) {
    newMessage = '';
    loading = false;
    newUsernameModalOpen = false;
    newUsername = '';
    get _t() {
        let message = this.chat.state.messages[0];
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
								<template #content><p>{${this.htmlToText(message.message)}}</p></template>
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
									<a-input-search
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxNQUFNLFdBQVc7SUFDaEIsUUFBUSxHQUFXLG9CQUFvQixDQUFDO0lBQ3hDLE9BQU8sR0FBVywySEFBMkgsQ0FBQztJQUM5SSxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsV0FBVyxHQUFXLE9BQU8sQ0FBQztDQUM5QjtBQUtELE1BQU0sUUFBUTtJQUNiLE1BQU0sQ0FBYztJQUVwQixRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztJQUMxQixLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUNwQixTQUFTLEVBQUUsS0FBSztRQUNoQixtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNyQixRQUFRLEVBQUUsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQzdCLE9BQU8sRUFBRSxLQUFLO0tBQ2QsQ0FBQyxDQUFDO0lBRUgsZ0JBQWdCLENBQTZCO0lBQzdDO1FBQ0MsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7WUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUN0QyxJQUFJLGdCQUE0QixDQUFDO1FBRWpDLElBQUksQ0FBQyxnQkFBZ0IsR0FB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YXNzIENoYXRNZXNzYWdlIHtcclxuXHR1c2VybmFtZTogc3RyaW5nID0gXCJDaGFkLCB0aGUgTGlzdGVuZXJcIjtcclxuXHRtZXNzYWdlOiBzdHJpbmcgPSBcIlNvcnJ5LCBJJ20gY3VycmVudGx5IHJlc3RpbmcgbXkgZWFycy4gSWYgeW91IHdhbnQgdG8gYmUgaGVhcmQsIGhlYWQgb3ZlciBpbnRvIG91ciBEaXNjb3JkLiBodHRwczovL2Rpc2NvcmQuZ2cvVWQ3VWZGSm1ZaiBcIjtcclxuXHR0aW1lc0Fzc2hvbGU6IG51bWJlciA9IDA7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHRpbWVDcmVhdGVkOiBzdHJpbmcgPSBcIjAwOjAwXCI7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmNsYXNzIEZhaXJDaGF0IHtcclxuXHRzb2NrZXQ/OiBGYWlyU29ja2V0O1xyXG5cclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlLnJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdGN1cnJlbnRDaGF0TnVtYmVyOiAtMSxcclxuXHRcdG1lc3NhZ2VzOiBbbmV3IENoYXRNZXNzYWdlKCldLFxyXG5cdFx0bG9hZGluZzogZmFsc2UsXHJcblx0fSk7XHJcblxyXG5cdGNoYXRTdWJzY3JpcHRpb24/OiBTdG9tcEpzLlN0b21wU3Vic2NyaXB0aW9uO1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5tYXJrUmF3KHRoaXMpO1xyXG5cdH1cclxuXHRjb25uZWN0KCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB0aHJvdyAwO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY29ubmVjdGVkIHx8IHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCkgdGhyb3cgMDtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRsZXQgcmVzb2x2ZUNvbm5lY3RlZDogKCkgPT4gdm9pZDtcclxuXHJcblx0XHR0aGlzLmNoYXRTdWJzY3JpcHRpb24gPSB0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy51c2VyRGF0YS5jaGF0TnVtKTtcclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvY2hhdC8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRJbml0KGRhdGEpO1xyXG5cdFx0XHRyZXNvbHZlQ29ubmVjdGVkKCk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvY2hhdC9pbml0LyRsYWRkZXJOdW0nLCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnVzZXJEYXRhLmNoYXROdW0pO1xyXG5cclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHsgcmVzb2x2ZUNvbm5lY3RlZCA9IHJlc29sdmU7IH0pO1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUNoYXRVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2NoYXQvJGxhZGRlck51bSddKSB7XHJcblx0XHRpZiAoIW1lc3NhZ2UpIHJldHVybjtcclxuXHRcdG1lc3NhZ2UudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS51c2VybmFtZSk7XHJcblx0XHRtZXNzYWdlLm1lc3NhZ2UgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS5tZXNzYWdlKTtcclxuXHRcdHRoaXMuc3RhdGUubWVzc2FnZXMudW5zaGlmdChtZXNzYWdlKTtcclxuXHRcdHRoaXMuc3RhdGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gaWYgKGNoYXREYXRhLm1lc3NhZ2VzLmxlbmd0aCA+IDMwKSBjaGF0RGF0YS5tZXNzYWdlcy5wb3AoKTtcclxuXHR9XHJcblx0aGFuZGxlQ2hhdEluaXQobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9jaGF0LyddKSB7XHJcblx0XHRpZiAobWVzc2FnZS5zdGF0dXMgPT09IFwiT0tcIikge1xyXG5cdFx0XHRpZiAobWVzc2FnZS5jb250ZW50KSB7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY3VycmVudENoYXROdW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudENoYXROdW1iZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5tZXNzYWdlcyA9IG1lc3NhZ2UuY29udGVudC5tZXNzYWdlcztcclxuXHRcdFx0XHRhbnRkLm1lc3NhZ2Uuc3VjY2VzcyhcclxuXHRcdFx0XHRcdGBDb25uZWN0ZWQgdG8gQ2hhZCMke21lc3NhZ2UuY29udGVudC5jdXJyZW50Q2hhdE51bWJlcn0gIWAsXHJcblx0XHRcdFx0XHQxMCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzZW5kTWVzc2FnZShtZXNzYWdlOiBzdHJpbmcpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAobWVzc2FnZSA9PSBcIlwiKSByZXR1cm47XHJcblxyXG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2Uuc2xpY2UoMCwgMjgwKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2NoYXQvcG9zdC8kY3VycmVudENoYXROdW1iZXInLCB7XHJcblx0XHRcdHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCxcclxuXHRcdFx0Y29udGVudDogbWVzc2FnZSxcclxuXHRcdH0sIHRoaXMuc3RhdGUuY3VycmVudENoYXROdW1iZXIpO1xyXG5cdH1cclxuXHJcblxyXG5cdC8vIGZ1bmN0aW9uIGNoYW5nZUNoYXRSb29tKGxhZGRlck51bSkge1xyXG5cdC8vICAgICBjaGF0U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XHJcblx0Ly8gICAgIGNoYXRTdWJzY3JpcHRpb24gPSBzdG9tcENsaWVudC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LycgKyBsYWRkZXJOdW0sXHJcblx0Ly8gICAgICAgICAobWVzc2FnZSkgPT4gaGFuZGxlQ2hhdFVwZGF0ZXMoSlNPTi5wYXJzZShtZXNzYWdlLmJvZHkpKSwge3V1aWQ6IGdldENvb2tpZShcIl91dWlkXCIpfSk7XHJcblx0Ly8gICAgIGluaXRDaGF0KGxhZGRlck51bSk7XHJcblx0Ly8gfVxyXG5cclxuXHQvLyBmdW5jdGlvbiB1cGRhdGVDaGF0VXNlcm5hbWUoZXZlbnQpIHtcclxuXHQvLyAgICAgY2hhdERhdGEubWVzc2FnZXMuZm9yRWFjaChtZXNzYWdlID0+IHtcclxuXHQvLyAgICAgICAgIGlmIChldmVudC5hY2NvdW50SWQgPT09IG1lc3NhZ2UuYWNjb3VudElkKSB7XHJcblx0Ly8gICAgICAgICAgICAgbWVzc2FnZS51c2VybmFtZSA9IGV2ZW50LmRhdGE7XHJcblx0Ly8gICAgICAgICB9XHJcblx0Ly8gICAgIH0pXHJcblx0Ly8gICAgIHVwZGF0ZUNoYXQoKTtcclxuXHQvLyB9XHJcblx0Y2hhbmdlVXNlcm5hbWUobmV3VXNlcm5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0bmV3VXNlcm5hbWUgPSBuZXdVc2VybmFtZS5zbGljZSgwLCAzMik7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lKSByZXR1cm4gZmFsc2U7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lLnRyaW0oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKG5ld1VzZXJuYW1lID09IHRoaXMudXNlckRhdGEudXNlcm5hbWUpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc29ja2V0Py5zZW5kKCcvYXBwL2FjY291bnQvbmFtZScsIHtcclxuXHRcdFx0dXVpZDogdGhpcy51c2VyRGF0YS51dWlkLFxyXG5cdFx0XHRjb250ZW50OiBuZXdVc2VybmFtZSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy51c2VyRGF0YS51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxufVxyXG5cclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyQ2hhdFZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0Y2hhdDogRmFpckNoYXQsXHJcbn0pIHtcclxuXHRuZXdNZXNzYWdlID0gJyc7XHJcblx0bG9hZGluZyA9IGZhbHNlO1xyXG5cclxuXHRuZXdVc2VybmFtZU1vZGFsT3BlbiA9IGZhbHNlO1xyXG5cdG5ld1VzZXJuYW1lID0gJyc7XHJcblxyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdGxldCBtZXNzYWdlID0gdGhpcy5jaGF0LnN0YXRlLm1lc3NhZ2VzWzBdO1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PENIQVQ+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdFwiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cIiR7dGhpcy5jaGF0LnN0YXRlLm1lc3NhZ2VzfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiIGJvcmRlcmVkXHJcblx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjaGVhZGVyPlxyXG5cdFx0XHRcdFx0XHQ8aDI+V2VsY29tZSB0byB0aGUgQ2hhZCN7JHt0aGlzLmNoYXQuc3RhdGUuY3VycmVudENoYXROdW1iZXJ9fSAhPC9oMj5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsobWVzc2FnZS50aW1lc0Fzc2hvbGUpfX08L2I+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXV0aG9yPjxiPnske21lc3NhZ2UudXNlcm5hbWV9fTwvYj48L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNjb250ZW50PjxwPnske3RoaXMuaHRtbFRvVGV4dChtZXNzYWdlLm1lc3NhZ2UpfX08L3A+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjZGF0ZXRpbWU+eyR7bWVzc2FnZS50aW1lQ3JlYXRlZH19PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0PC9hLWxpc3QtaXRlbT5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWxpc3Q+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdC1uZXdcIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCIke1sxXX1cIlxyXG5cdFx0XHRcdFx0XHRzaXplPVwic21hbGxcIiBib3JkZXJlZFxyXG5cdFx0XHRcdFx0XHRpdGVtLWxheW91dD1cInZlcnRpY2FsXCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNyZW5kZXJJdGVtPVwieyBpdGVtOiBtZXNzYWdlIH1cIj5cclxuXHRcdFx0XHRcdFx0PGEtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F2YXRhcj48Yj57JHt0aGlzLmFzc2hvbGVNYXJrKDEyMyl9fTwvYj48L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNhdXRob3I+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHske3RoaXMuY2hhdC51c2VyRGF0YS51c2VybmFtZX19XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIEBjbGljaz1cIiR7dGhpcy5jaGFuZ2VVc2VybmFtZSgpfVwiPvCflok8L3NwYW4+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNjb250ZW50PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8YS1pbnB1dC1zZWFyY2hcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHYtbW9kZWw6dmFsdWU9XCIke3RoaXMubmV3TWVzc2FnZX1cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJDaGFkIGlzIGxpc3RlbmluZy4uLlwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRAc2VhcmNoPVwiJHt0aGlzLnNlbmRNZXNzYWdlKCl9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDpsb2FkaW5nPVwiJHt0aGlzLmNoYXQuc3RhdGUubG9hZGluZ31cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZW50ZXItYnV0dG9uPVwiU2VuZFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvPlxyXG5cdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0PC9hLWxpc3QtaXRlbT5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWxpc3Q+XHJcblx0XHRcdFx0PGEtbW9kYWxcclxuXHRcdFx0XHRcdFx0di1tb2RlbDp2aXNpYmxlPVwiJHt0aGlzLm5ld1VzZXJuYW1lTW9kYWxPcGVufVwiXHJcblx0XHRcdFx0XHRcdHRpdGxlPVwiV2hhdCBzaGFsbCBiZSB5b3VyIG5ldyBuYW1lP1wiXHJcblx0XHRcdFx0XHRcdEBvaz1cIiR7dGhpcy5jb25maXJtTmFtZUNoYW5nZSgpfVwiXHJcblx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdDxhLWlucHV0IHJlZj1cImVsTmV3VXNlcm5hbWVJbnB1dFwiIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMubmV3VXNlcm5hbWV9XCIgQHByZXNzRW50ZXI9XCIke3RoaXMuY29uZmlybU5hbWVDaGFuZ2UoKX1cIiBtYXhsZW5ndGg9XCIzMlwiIC8+XHJcblx0XHRcdFx0PC9hLW1vZGFsPlxyXG5cdFx0XHQ8L0NIQVQ+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRhc3Nob2xlTWFyayhuOiBudW1iZXIpIHtcclxuXHRcdGlmIChuID09IDApIHJldHVybiAnQCc7XHJcblx0XHRjb25zdCBtYXJrcyA9IFtcIkBcIiwgXCLimaBcIiwgXCLimaNcIiwgXCLimaVcIiwgXCLimaZcIl07XHJcblx0XHRyZXR1cm4gbWFya3Nbbl0gfHwgbWFya3MucG9wKCk7XHJcblx0fVxyXG5cdGh0bWxUb1RleHQoczogc3RyaW5nKSB7XHJcblx0XHRsZXQgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuXHRcdGEuaW5uZXJIVE1MID0gcztcclxuXHRcdHJldHVybiBhLmlubmVyVGV4dDtcclxuXHR9XHJcblx0YXN5bmMgc2VuZE1lc3NhZ2UoKSB7XHJcblx0XHR0aGlzLmNoYXQuc3RhdGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNDAwKSk7XHJcblx0XHR0aGlzLmNoYXQuc2VuZE1lc3NhZ2UodGhpcy5uZXdNZXNzYWdlKTtcclxuXHRcdHdoaWxlICh0aGlzLmNoYXQuc3RhdGUubG9hZGluZykge1xyXG5cdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwKSk7XHJcblx0XHR9XHJcblx0XHR0aGlzLm5ld01lc3NhZ2UgPSAnJztcclxuXHR9XHJcblx0Y2hhbmdlVXNlcm5hbWUoKSB7XHJcblx0XHR0aGlzLm5ld1VzZXJuYW1lID0gdGhpcy5jaGF0LnVzZXJEYXRhLnVzZXJuYW1lO1xyXG5cdFx0dGhpcy5uZXdVc2VybmFtZU1vZGFsT3BlbiA9IHRydWU7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0bGV0IGlucHV0ID0gdGhpcy4kcmVmcy5lbE5ld1VzZXJuYW1lSW5wdXQgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHRcdFx0aW5wdXQ/LmZvY3VzKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblx0Y29uZmlybU5hbWVDaGFuZ2UoKSB7XHJcblx0XHR0aGlzLm5ld1VzZXJuYW1lTW9kYWxPcGVuID0gZmFsc2U7XHJcblx0XHR0aGlzLmNoYXQuY2hhbmdlVXNlcm5hbWUodGhpcy5uZXdVc2VybmFtZSk7XHJcblx0fVxyXG59Il19