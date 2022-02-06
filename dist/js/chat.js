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
						:data-source="[1]"
						size="small" bordered
						item-layout="vertical"

						>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(123)}}</b></template>
								<template #author>
									{${this.chat.userData.username}}
									<span @click="changeUsername">🖉</span>
								</template>
								<template #content>								
									<a-input-search
											v-model:value="newMessage"
											placeholder="Chad is listening..."
											@search="sendMessage"
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
						@ok="confirmNameChange"
						>
					<a-input ref="elNewUsernameInput" v-model:value="newUsername" @pressEnter="confirmNameChange" :maxlength="32" />
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxNQUFNLFdBQVc7SUFDaEIsUUFBUSxHQUFXLG9CQUFvQixDQUFDO0lBQ3hDLE9BQU8sR0FBVywySEFBMkgsQ0FBQztJQUM5SSxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsV0FBVyxHQUFXLE9BQU8sQ0FBQztDQUM5QjtBQUtELE1BQU0sUUFBUTtJQUNiLE1BQU0sQ0FBYztJQUNwQixTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWQsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7SUFDMUIsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDcEIsU0FBUyxFQUFFLEtBQUs7UUFDaEIsbUJBQW1CLEVBQUUsS0FBSztRQUMxQixpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDckIsUUFBUSxFQUFFLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUM3QixPQUFPLEVBQUUsS0FBSztLQUNkLENBQUMsQ0FBQztJQUVILGdCQUFnQixDQUE2QjtJQUM3QyxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN6RSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUV0QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUs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LEdBQUcsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxjQUFjO1FBQ2IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDL0MsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUNqQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBc0MsQ0FBQztZQUM5RCxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBNUZBO0lBREMsV0FBVztxQ0E2RFg7QUF0RUksV0FBVztJQURoQixlQUFlO0dBQ1YsV0FBVyxDQXNHaEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbmNsYXNzIENoYXRNZXNzYWdlIHtcclxuXHR1c2VybmFtZTogc3RyaW5nID0gXCJDaGFkLCB0aGUgTGlzdGVuZXJcIjtcclxuXHRtZXNzYWdlOiBzdHJpbmcgPSBcIlNvcnJ5LCBJJ20gY3VycmVudGx5IHJlc3RpbmcgbXkgZWFycy4gSWYgeW91IHdhbnQgdG8gYmUgaGVhcmQsIGhlYWQgb3ZlciBpbnRvIG91ciBEaXNjb3JkLiBodHRwczovL2Rpc2NvcmQuZ2cvVWQ3VWZGSm1ZaiBcIjtcclxuXHR0aW1lc0Fzc2hvbGU6IG51bWJlciA9IDA7XHJcblx0YWNjb3VudElkOiBhY2NvdW50SWQgPSAwO1xyXG5cdHRpbWVDcmVhdGVkOiBzdHJpbmcgPSBcIjAwOjAwXCI7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmNsYXNzIEZhaXJDaGF0IHtcclxuXHRzb2NrZXQ/OiBGYWlyU29ja2V0O1xyXG5cdGxhZGRlck51bSA9IDE7XHJcblxyXG5cdHVzZXJEYXRhID0gbmV3IFVzZXJEYXRhKCk7XHJcblx0c3RhdGUgPSBWdWUucmVhY3RpdmUoe1xyXG5cdFx0Y29ubmVjdGVkOiBmYWxzZSxcclxuXHRcdGNvbm5lY3Rpb25SZXF1ZXN0ZWQ6IGZhbHNlLFxyXG5cdFx0Y3VycmVudENoYXROdW1iZXI6IC0xLFxyXG5cdFx0bWVzc2FnZXM6IFtuZXcgQ2hhdE1lc3NhZ2UoKV0sXHJcblx0XHRsb2FkaW5nOiBmYWxzZSxcclxuXHR9KTtcclxuXHJcblx0Y2hhdFN1YnNjcmlwdGlvbj86IFN0b21wSnMuU3RvbXBTdWJzY3JpcHRpb247XHJcblx0Y29ubmVjdCgpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMudXNlckRhdGEudXVpZCkgdGhyb3cgMDtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmNvbm5lY3RlZCB8fCB0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblxyXG5cdFx0dGhpcy5jaGF0U3Vic2NyaXB0aW9uID0gdGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdG9waWMvY2hhdC8kbGFkZGVyTnVtJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVDaGF0VXBkYXRlcyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMubGFkZGVyTnVtKTtcclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvY2hhdC8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNoYXRJbml0KGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2NoYXQvaW5pdC8kbGFkZGVyTnVtJywgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5sYWRkZXJOdW0pO1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUNoYXRVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2NoYXQvJGxhZGRlck51bSddKSB7XHJcblx0XHRpZiAoIW1lc3NhZ2UpIHJldHVybjtcclxuXHRcdG1lc3NhZ2UudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS51c2VybmFtZSk7XHJcblx0XHRtZXNzYWdlLm1lc3NhZ2UgPSB1bmVzY2FwZUh0bWwobWVzc2FnZS5tZXNzYWdlKTtcclxuXHRcdHRoaXMuc3RhdGUubWVzc2FnZXMudW5zaGlmdChtZXNzYWdlKTtcclxuXHRcdHRoaXMuc3RhdGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0Ly8gaWYgKGNoYXREYXRhLm1lc3NhZ2VzLmxlbmd0aCA+IDMwKSBjaGF0RGF0YS5tZXNzYWdlcy5wb3AoKTtcclxuXHR9XHJcblx0aGFuZGxlQ2hhdEluaXQobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9jaGF0LyddKSB7XHJcblx0XHRpZiAobWVzc2FnZS5zdGF0dXMgPT09IFwiT0tcIikge1xyXG5cdFx0XHRpZiAobWVzc2FnZS5jb250ZW50KSB7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdHRoaXMubGFkZGVyTnVtID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRDaGF0TnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY3VycmVudENoYXROdW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudENoYXROdW1iZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5tZXNzYWdlcyA9IG1lc3NhZ2UuY29udGVudC5tZXNzYWdlcztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2VuZE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKG1lc3NhZ2UgPT0gXCJcIikgcmV0dXJuO1xyXG5cclxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnNsaWNlKDAsIDI4MCk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9jaGF0L3Bvc3QvJGN1cnJlbnRDaGF0TnVtYmVyJywge1xyXG5cdFx0XHR1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQsXHJcblx0XHRcdGNvbnRlbnQ6IG1lc3NhZ2UsXHJcblx0XHR9LCB0aGlzLnN0YXRlLmN1cnJlbnRDaGF0TnVtYmVyKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBmdW5jdGlvbiBjaGFuZ2VDaGF0Um9vbShsYWRkZXJOdW0pIHtcclxuXHQvLyAgICAgY2hhdFN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xyXG5cdC8vICAgICBjaGF0U3Vic2NyaXB0aW9uID0gc3RvbXBDbGllbnQuc3Vic2NyaWJlKCcvdG9waWMvY2hhdC8nICsgbGFkZGVyTnVtLFxyXG5cdC8vICAgICAgICAgKG1lc3NhZ2UpID0+IGhhbmRsZUNoYXRVcGRhdGVzKEpTT04ucGFyc2UobWVzc2FnZS5ib2R5KSksIHt1dWlkOiBnZXRDb29raWUoXCJfdXVpZFwiKX0pO1xyXG5cdC8vICAgICBpbml0Q2hhdChsYWRkZXJOdW0pO1xyXG5cdC8vIH1cclxuXHJcblx0Ly8gZnVuY3Rpb24gdXBkYXRlQ2hhdFVzZXJuYW1lKGV2ZW50KSB7XHJcblx0Ly8gICAgIGNoYXREYXRhLm1lc3NhZ2VzLmZvckVhY2gobWVzc2FnZSA9PiB7XHJcblx0Ly8gICAgICAgICBpZiAoZXZlbnQuYWNjb3VudElkID09PSBtZXNzYWdlLmFjY291bnRJZCkge1xyXG5cdC8vICAgICAgICAgICAgIG1lc3NhZ2UudXNlcm5hbWUgPSBldmVudC5kYXRhO1xyXG5cdC8vICAgICAgICAgfVxyXG5cdC8vICAgICB9KVxyXG5cdC8vICAgICB1cGRhdGVDaGF0KCk7XHJcblx0Ly8gfVxyXG5cdGNoYW5nZVVzZXJuYW1lKG5ld1VzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdG5ld1VzZXJuYW1lID0gbmV3VXNlcm5hbWUuc2xpY2UoMCwgMzIpO1xyXG5cdFx0aWYgKCFuZXdVc2VybmFtZSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKCFuZXdVc2VybmFtZS50cmltKCkpIHJldHVybiBmYWxzZTtcclxuXHRcdGlmIChuZXdVc2VybmFtZSA9PSB0aGlzLnVzZXJEYXRhLnVzZXJuYW1lKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0aGlzLnNvY2tldD8uc2VuZCgnL2FwcC9hY2NvdW50L25hbWUnLCB7XHJcblx0XHRcdHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCxcclxuXHRcdFx0Y29udGVudDogbmV3VXNlcm5hbWUsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMudXNlckRhdGEudXNlcm5hbWUgPSBuZXdVc2VybmFtZTtcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcbkBHbG9iYWxDb21wb25lbnRcclxuY2xhc3MgRmFpckNoYXRWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGNoYXQ6IEZhaXJDaGF0LFxyXG59KSB7XHJcblx0bmV3TWVzc2FnZSA9ICcnO1xyXG5cdGxvYWRpbmcgPSBmYWxzZTtcclxuXHJcblx0bmV3VXNlcm5hbWVNb2RhbE9wZW4gPSBmYWxzZTtcclxuXHRuZXdVc2VybmFtZSA9ICcnO1xyXG5cclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgbWVzc2FnZSA9IHRoaXMuY2hhdC5zdGF0ZS5tZXNzYWdlc1swXTtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxDSEFUPlxyXG5cdFx0XHRcdDxhLWxpc3RcclxuXHRcdFx0XHRcdFx0Y2xhc3M9XCJmYWlyLWNoYXRcIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCIke3RoaXMuY2hhdC5zdGF0ZS5tZXNzYWdlc31cIlxyXG5cdFx0XHRcdFx0XHRzaXplPVwic21hbGxcIiBib3JkZXJlZFxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2hlYWRlcj5cclxuXHRcdFx0XHRcdFx0PGgyPldlbGNvbWUgdG8gdGhlIENoYWQjeyR7dGhpcy5jaGF0LnN0YXRlLmN1cnJlbnRDaGF0TnVtYmVyfX0gITwvaDI+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNyZW5kZXJJdGVtPVwieyBpdGVtOiBtZXNzYWdlIH1cIj5cclxuXHRcdFx0XHRcdFx0PGEtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F2YXRhcj48Yj57JHt0aGlzLmFzc2hvbGVNYXJrKG1lc3NhZ2UudGltZXNBc3Nob2xlKX19PC9iPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F1dGhvcj48Yj57JHttZXNzYWdlLnVzZXJuYW1lfX08L2I+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY29udGVudD48cD57JHt0aGlzLmh0bWxUb1RleHQobWVzc2FnZS5tZXNzYWdlKX19PC9wPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2RhdGV0aW1lPnske21lc3NhZ2UudGltZUNyZWF0ZWR9fTwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdDwvYS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1saXN0PlxyXG5cdFx0XHRcdDxhLWxpc3RcclxuXHRcdFx0XHRcdFx0Y2xhc3M9XCJmYWlyLWNoYXQtbmV3XCJcclxuXHRcdFx0XHRcdFx0OmRhdGEtc291cmNlPVwiWzFdXCJcclxuXHRcdFx0XHRcdFx0c2l6ZT1cInNtYWxsXCIgYm9yZGVyZWRcclxuXHRcdFx0XHRcdFx0aXRlbS1sYXlvdXQ9XCJ2ZXJ0aWNhbFwiXHJcblxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsoMTIzKX19PC9iPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F1dGhvcj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0eyR7dGhpcy5jaGF0LnVzZXJEYXRhLnVzZXJuYW1lfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gQGNsaWNrPVwiY2hhbmdlVXNlcm5hbWVcIj7wn5aJPC9zcGFuPlxyXG5cdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY29udGVudD5cdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxhLWlucHV0LXNlYXJjaFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0di1tb2RlbDp2YWx1ZT1cIm5ld01lc3NhZ2VcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJDaGFkIGlzIGxpc3RlbmluZy4uLlwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRAc2VhcmNoPVwic2VuZE1lc3NhZ2VcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbnRlci1idXR0b249XCJTZW5kXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb21tZW50PlxyXG5cdFx0XHRcdFx0XHQ8L2EtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtbGlzdD5cclxuXHRcdFx0XHQ8YS1tb2RhbFxyXG5cdFx0XHRcdFx0XHR2LW1vZGVsOnZpc2libGU9XCIke3RoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW59XCJcclxuXHRcdFx0XHRcdFx0dGl0bGU9XCJXaGF0IHNoYWxsIGJlIHlvdXIgbmV3IG5hbWU/XCJcclxuXHRcdFx0XHRcdFx0QG9rPVwiY29uZmlybU5hbWVDaGFuZ2VcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1VzZXJuYW1lSW5wdXRcIiB2LW1vZGVsOnZhbHVlPVwibmV3VXNlcm5hbWVcIiBAcHJlc3NFbnRlcj1cImNvbmZpcm1OYW1lQ2hhbmdlXCIgOm1heGxlbmd0aD1cIjMyXCIgLz5cclxuXHRcdFx0XHQ8L2EtbW9kYWw+XHJcblx0XHRcdDwvQ0hBVD5cclxuXHRcdGA7XHJcblx0fVxyXG5cdGFzc2hvbGVNYXJrKG46IG51bWJlcikge1xyXG5cdFx0aWYgKG4gPT0gMCkgcmV0dXJuICdAJztcclxuXHRcdGNvbnN0IG1hcmtzID0gW1wiQFwiLCBcIuKZoFwiLCBcIuKZo1wiLCBcIuKZpVwiLCBcIuKZplwiXTtcclxuXHRcdHJldHVybiBtYXJrc1tuXSB8fCBtYXJrcy5wb3AoKTtcclxuXHR9XHJcblx0aHRtbFRvVGV4dChzOiBzdHJpbmcpIHtcclxuXHRcdGxldCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG5cdFx0YS5pbm5lckhUTUwgPSBzO1xyXG5cdFx0cmV0dXJuIGEuaW5uZXJUZXh0O1xyXG5cdH1cclxuXHRhc3luYyBzZW5kTWVzc2FnZSgpIHtcclxuXHRcdHRoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA0MDApKTtcclxuXHRcdHRoaXMuY2hhdC5zZW5kTWVzc2FnZSh0aGlzLm5ld01lc3NhZ2UpO1xyXG5cdFx0d2hpbGUgKHRoaXMuY2hhdC5zdGF0ZS5sb2FkaW5nKSB7XHJcblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDApKTtcclxuXHRcdH1cclxuXHRcdHRoaXMubmV3TWVzc2FnZSA9ICcnO1xyXG5cdH1cclxuXHRjaGFuZ2VVc2VybmFtZSgpIHtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWUgPSB0aGlzLmNoYXQudXNlckRhdGEudXNlcm5hbWU7XHJcblx0XHR0aGlzLm5ld1VzZXJuYW1lTW9kYWxPcGVuID0gdHJ1ZTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRsZXQgaW5wdXQgPSB0aGlzLiRyZWZzLmVsTmV3VXNlcm5hbWVJbnB1dCBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdFx0XHRpbnB1dD8uZm9jdXMoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRjb25maXJtTmFtZUNoYW5nZSgpIHtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW4gPSBmYWxzZTtcclxuXHRcdHRoaXMuY2hhdC5jaGFuZ2VVc2VybmFtZSh0aGlzLm5ld1VzZXJuYW1lKTtcclxuXHR9XHJcbn0iXX0=