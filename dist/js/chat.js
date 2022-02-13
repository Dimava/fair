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
    ladderNum = 1;
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
            return false;
        this.state.connectionRequested = true;
        this.chatSubscription = this.socket.subscribe('/topic/chat/$ladderNum', (data) => {
            this.handleChatUpdates(data);
        }, { uuid: this.userData.uuid }, this.ladderNum);
        this.socket.subscribe('/user/queue/chat/', (data) => {
            this.handleChatInit(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, this.ladderNum);
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
                this.ladderNum = message.content.currentChatNumber;
                this.state.currentChatNumber = message.content.currentChatNumber;
                this.state.messages = message.content.messages;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxNQUFNLFdBQVc7SUFDaEIsUUFBUSxHQUFXLG9CQUFvQixDQUFDO0lBQ3hDLE9BQU8sR0FBVywySEFBMkgsQ0FBQztJQUM5SSxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsV0FBVyxHQUFXLE9BQU8sQ0FBQztDQUM5QjtBQUtELE1BQU0sUUFBUTtJQUNiLE1BQU0sQ0FBYztJQUNwQixTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWQsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7SUFDMUIsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDcEIsU0FBUyxFQUFFLEtBQUs7UUFDaEIsbUJBQW1CLEVBQUUsS0FBSztRQUMxQixpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDckIsUUFBUSxFQUFFLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUM3QixPQUFPLEVBQUUsS0FBSztLQUNkLENBQUMsQ0FBQztJQUVILGdCQUFnQixDQUE2QjtJQUM3QztRQUNDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQ0QsT0FBTztRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7WUFBRSxNQUFNLENBQUMsQ0FBQztRQUNqQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7UUFFdEMsSUFBSSxDQUFDLGdCQUFnQixH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LENBQUM7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQy9CLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDM0M7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBQ0QsY0FBYztRQUNiLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQy9DLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUM7UUFDakMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQXNDLENBQUM7WUFDOUQsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELGlCQUFpQjtRQUNoQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQTNGQTtJQURDLFdBQVc7cUNBNERYO0FBckVJLFdBQVc7SUFEaEIsZUFBZTtHQUNWLFdBQVcsQ0FxR2hCIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5jbGFzcyBDaGF0TWVzc2FnZSB7XHJcblx0dXNlcm5hbWU6IHN0cmluZyA9IFwiQ2hhZCwgdGhlIExpc3RlbmVyXCI7XHJcblx0bWVzc2FnZTogc3RyaW5nID0gXCJTb3JyeSwgSSdtIGN1cnJlbnRseSByZXN0aW5nIG15IGVhcnMuIElmIHlvdSB3YW50IHRvIGJlIGhlYXJkLCBoZWFkIG92ZXIgaW50byBvdXIgRGlzY29yZC4gaHR0cHM6Ly9kaXNjb3JkLmdnL1VkN1VmRkptWWogXCI7XHJcblx0dGltZXNBc3Nob2xlOiBudW1iZXIgPSAwO1xyXG5cdGFjY291bnRJZDogYWNjb3VudElkID0gMDtcclxuXHR0aW1lQ3JlYXRlZDogc3RyaW5nID0gXCIwMDowMFwiO1xyXG59XHJcblxyXG5cclxuXHJcblxyXG5jbGFzcyBGYWlyQ2hhdCB7XHJcblx0c29ja2V0PzogRmFpclNvY2tldDtcclxuXHRsYWRkZXJOdW0gPSAxO1xyXG5cclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlLnJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdGN1cnJlbnRDaGF0TnVtYmVyOiAtMSxcclxuXHRcdG1lc3NhZ2VzOiBbbmV3IENoYXRNZXNzYWdlKCldLFxyXG5cdFx0bG9hZGluZzogZmFsc2UsXHJcblx0fSk7XHJcblxyXG5cdGNoYXRTdWJzY3JpcHRpb24/OiBTdG9tcEpzLlN0b21wU3Vic2NyaXB0aW9uO1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5tYXJrUmF3KHRoaXMpO1xyXG5cdH1cclxuXHRjb25uZWN0KCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB0aHJvdyAwO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY29ubmVjdGVkIHx8IHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLmNoYXRTdWJzY3JpcHRpb24gPSB0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5sYWRkZXJOdW0pO1xyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9jaGF0LycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlQ2hhdEluaXQoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvY2hhdC9pbml0LyRsYWRkZXJOdW0nLCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLmxhZGRlck51bSk7XHJcblx0fVxyXG5cclxuXHJcblx0aGFuZGxlQ2hhdFVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdG9waWMvY2hhdC8kbGFkZGVyTnVtJ10pIHtcclxuXHRcdGlmICghbWVzc2FnZSkgcmV0dXJuO1xyXG5cdFx0bWVzc2FnZS51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChtZXNzYWdlLnVzZXJuYW1lKTtcclxuXHRcdG1lc3NhZ2UubWVzc2FnZSA9IHVuZXNjYXBlSHRtbChtZXNzYWdlLm1lc3NhZ2UpO1xyXG5cdFx0dGhpcy5zdGF0ZS5tZXNzYWdlcy51bnNoaWZ0KG1lc3NhZ2UpO1xyXG5cdFx0dGhpcy5zdGF0ZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHQvLyBpZiAoY2hhdERhdGEubWVzc2FnZXMubGVuZ3RoID4gMzApIGNoYXREYXRhLm1lc3NhZ2VzLnBvcCgpO1xyXG5cdH1cclxuXHRoYW5kbGVDaGF0SW5pdChtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2NoYXQvJ10pIHtcclxuXHRcdGlmIChtZXNzYWdlLnN0YXR1cyA9PT0gXCJPS1wiKSB7XHJcblx0XHRcdGlmIChtZXNzYWdlLmNvbnRlbnQpIHtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3RlZCA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXJOdW0gPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudENoYXROdW1iZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jdXJyZW50Q2hhdE51bWJlciA9IG1lc3NhZ2UuY29udGVudC5jdXJyZW50Q2hhdE51bWJlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLm1lc3NhZ2VzID0gbWVzc2FnZS5jb250ZW50Lm1lc3NhZ2VzO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzZW5kTWVzc2FnZShtZXNzYWdlOiBzdHJpbmcpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAobWVzc2FnZSA9PSBcIlwiKSByZXR1cm47XHJcblxyXG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2Uuc2xpY2UoMCwgMjgwKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2NoYXQvcG9zdC8kY3VycmVudENoYXROdW1iZXInLCB7XHJcblx0XHRcdHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCxcclxuXHRcdFx0Y29udGVudDogbWVzc2FnZSxcclxuXHRcdH0sIHRoaXMuc3RhdGUuY3VycmVudENoYXROdW1iZXIpO1xyXG5cdH1cclxuXHJcblxyXG5cdC8vIGZ1bmN0aW9uIGNoYW5nZUNoYXRSb29tKGxhZGRlck51bSkge1xyXG5cdC8vICAgICBjaGF0U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XHJcblx0Ly8gICAgIGNoYXRTdWJzY3JpcHRpb24gPSBzdG9tcENsaWVudC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LycgKyBsYWRkZXJOdW0sXHJcblx0Ly8gICAgICAgICAobWVzc2FnZSkgPT4gaGFuZGxlQ2hhdFVwZGF0ZXMoSlNPTi5wYXJzZShtZXNzYWdlLmJvZHkpKSwge3V1aWQ6IGdldENvb2tpZShcIl91dWlkXCIpfSk7XHJcblx0Ly8gICAgIGluaXRDaGF0KGxhZGRlck51bSk7XHJcblx0Ly8gfVxyXG5cclxuXHQvLyBmdW5jdGlvbiB1cGRhdGVDaGF0VXNlcm5hbWUoZXZlbnQpIHtcclxuXHQvLyAgICAgY2hhdERhdGEubWVzc2FnZXMuZm9yRWFjaChtZXNzYWdlID0+IHtcclxuXHQvLyAgICAgICAgIGlmIChldmVudC5hY2NvdW50SWQgPT09IG1lc3NhZ2UuYWNjb3VudElkKSB7XHJcblx0Ly8gICAgICAgICAgICAgbWVzc2FnZS51c2VybmFtZSA9IGV2ZW50LmRhdGE7XHJcblx0Ly8gICAgICAgICB9XHJcblx0Ly8gICAgIH0pXHJcblx0Ly8gICAgIHVwZGF0ZUNoYXQoKTtcclxuXHQvLyB9XHJcblx0Y2hhbmdlVXNlcm5hbWUobmV3VXNlcm5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0bmV3VXNlcm5hbWUgPSBuZXdVc2VybmFtZS5zbGljZSgwLCAzMik7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lKSByZXR1cm4gZmFsc2U7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lLnRyaW0oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKG5ld1VzZXJuYW1lID09IHRoaXMudXNlckRhdGEudXNlcm5hbWUpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc29ja2V0Py5zZW5kKCcvYXBwL2FjY291bnQvbmFtZScsIHtcclxuXHRcdFx0dXVpZDogdGhpcy51c2VyRGF0YS51dWlkLFxyXG5cdFx0XHRjb250ZW50OiBuZXdVc2VybmFtZSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy51c2VyRGF0YS51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxufVxyXG5cclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyQ2hhdFZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0Y2hhdDogRmFpckNoYXQsXHJcbn0pIHtcclxuXHRuZXdNZXNzYWdlID0gJyc7XHJcblx0bG9hZGluZyA9IGZhbHNlO1xyXG5cclxuXHRuZXdVc2VybmFtZU1vZGFsT3BlbiA9IGZhbHNlO1xyXG5cdG5ld1VzZXJuYW1lID0gJyc7XHJcblxyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdGxldCBtZXNzYWdlID0gdGhpcy5jaGF0LnN0YXRlLm1lc3NhZ2VzWzBdO1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PENIQVQ+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdFwiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cIiR7dGhpcy5jaGF0LnN0YXRlLm1lc3NhZ2VzfVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiIGJvcmRlcmVkXHJcblx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdDx0ZW1wbGF0ZSAjaGVhZGVyPlxyXG5cdFx0XHRcdFx0XHQ8aDI+V2VsY29tZSB0byB0aGUgQ2hhZCN7JHt0aGlzLmNoYXQuc3RhdGUuY3VycmVudENoYXROdW1iZXJ9fSAhPC9oMj5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsobWVzc2FnZS50aW1lc0Fzc2hvbGUpfX08L2I+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXV0aG9yPjxiPnske21lc3NhZ2UudXNlcm5hbWV9fTwvYj48L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNjb250ZW50PjxwPnske3RoaXMuaHRtbFRvVGV4dChtZXNzYWdlLm1lc3NhZ2UpfX08L3A+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjZGF0ZXRpbWU+eyR7bWVzc2FnZS50aW1lQ3JlYXRlZH19PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0PC9hLWxpc3QtaXRlbT5cclxuXHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0PC9hLWxpc3Q+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdC1uZXdcIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCIke1sxXX1cIlxyXG5cdFx0XHRcdFx0XHRzaXplPVwic21hbGxcIiBib3JkZXJlZFxyXG5cdFx0XHRcdFx0XHRpdGVtLWxheW91dD1cInZlcnRpY2FsXCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNyZW5kZXJJdGVtPVwieyBpdGVtOiBtZXNzYWdlIH1cIj5cclxuXHRcdFx0XHRcdFx0PGEtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F2YXRhcj48Yj57JHt0aGlzLmFzc2hvbGVNYXJrKDEyMyl9fTwvYj48L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNhdXRob3I+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHske3RoaXMuY2hhdC51c2VyRGF0YS51c2VybmFtZX19XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIEBjbGljaz1cIiR7dGhpcy5jaGFuZ2VVc2VybmFtZSgpfVwiPvCflok8L3NwYW4+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICNjb250ZW50Plx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0PGEtaW5wdXQtc2VhcmNoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2LW1vZGVsOnZhbHVlPVwiJHt0aGlzLm5ld01lc3NhZ2V9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwiQ2hhZCBpcyBsaXN0ZW5pbmcuLi5cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0QHNlYXJjaD1cIiR7dGhpcy5zZW5kTWVzc2FnZSgpfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5jaGF0LnN0YXRlLmxvYWRpbmd9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVudGVyLWJ1dHRvbj1cIlNlbmRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Lz5cclxuXHRcdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdDwvYS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1saXN0PlxyXG5cdFx0XHRcdDxhLW1vZGFsXHJcblx0XHRcdFx0XHRcdHYtbW9kZWw6dmlzaWJsZT1cIiR7dGhpcy5uZXdVc2VybmFtZU1vZGFsT3Blbn1cIlxyXG5cdFx0XHRcdFx0XHR0aXRsZT1cIldoYXQgc2hhbGwgYmUgeW91ciBuZXcgbmFtZT9cIlxyXG5cdFx0XHRcdFx0XHRAb2s9XCIke3RoaXMuY29uZmlybU5hbWVDaGFuZ2UoKX1cIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1VzZXJuYW1lSW5wdXRcIiB2LW1vZGVsOnZhbHVlPVwiJHt0aGlzLm5ld1VzZXJuYW1lfVwiIEBwcmVzc0VudGVyPVwiJHt0aGlzLmNvbmZpcm1OYW1lQ2hhbmdlKCl9XCIgbWF4bGVuZ3RoPVwiMzJcIiAvPlxyXG5cdFx0XHRcdDwvYS1tb2RhbD5cclxuXHRcdFx0PC9DSEFUPlxyXG5cdFx0YDtcclxuXHR9XHJcblx0YXNzaG9sZU1hcmsobjogbnVtYmVyKSB7XHJcblx0XHRpZiAobiA9PSAwKSByZXR1cm4gJ0AnO1xyXG5cdFx0Y29uc3QgbWFya3MgPSBbXCJAXCIsIFwi4pmgXCIsIFwi4pmjXCIsIFwi4pmlXCIsIFwi4pmmXCJdO1xyXG5cdFx0cmV0dXJuIG1hcmtzW25dIHx8IG1hcmtzLnBvcCgpO1xyXG5cdH1cclxuXHRodG1sVG9UZXh0KHM6IHN0cmluZykge1xyXG5cdFx0bGV0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcblx0XHRhLmlubmVySFRNTCA9IHM7XHJcblx0XHRyZXR1cm4gYS5pbm5lclRleHQ7XHJcblx0fVxyXG5cdGFzeW5jIHNlbmRNZXNzYWdlKCkge1xyXG5cdFx0dGhpcy5jaGF0LnN0YXRlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0YXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDQwMCkpO1xyXG5cdFx0dGhpcy5jaGF0LnNlbmRNZXNzYWdlKHRoaXMubmV3TWVzc2FnZSk7XHJcblx0XHR3aGlsZSAodGhpcy5jaGF0LnN0YXRlLmxvYWRpbmcpIHtcclxuXHRcdFx0YXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMCkpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5uZXdNZXNzYWdlID0gJyc7XHJcblx0fVxyXG5cdGNoYW5nZVVzZXJuYW1lKCkge1xyXG5cdFx0dGhpcy5uZXdVc2VybmFtZSA9IHRoaXMuY2hhdC51c2VyRGF0YS51c2VybmFtZTtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW4gPSB0cnVlO1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGxldCBpbnB1dCA9IHRoaXMuJHJlZnMuZWxOZXdVc2VybmFtZUlucHV0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHRcdGlucHV0Py5mb2N1cygpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cdGNvbmZpcm1OYW1lQ2hhbmdlKCkge1xyXG5cdFx0dGhpcy5uZXdVc2VybmFtZU1vZGFsT3BlbiA9IGZhbHNlO1xyXG5cdFx0dGhpcy5jaGF0LmNoYW5nZVVzZXJuYW1lKHRoaXMubmV3VXNlcm5hbWUpO1xyXG5cdH1cclxufSJdfQ==