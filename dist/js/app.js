"use strict";
// https://raw.githack.com/Dimava/fair-client/master/dist/index.html
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let userData = new UserData();
userData.uuid = localStorage.getItem('uuid') || '';
let socket = new FairSocket();
socket.userData = userData;
let chat = new FairChat();
chat.socket = socket;
chat.userData = userData;
class AppVue extends VueWithProps({
    chat: FairChat,
    userData: UserData,
    socket: FairSocket,
}) {
    importModalOpened = false;
    newUuid = '';
    get _t() {
        return `
			<APP>
				<FairChatVue :chat="chat" />
				<a-modal
						v-model:visible="${this.importModalOpened}"
						title="UUID import"
						@ok="confirmUuidImport"
						>
					This client does not support making its own uuids
					<br>
					Please paste your UUID
					<a-input ref="elNewUuidInput" v-model:value="newUuid" @pressEnter="confirmUuidImport" :maxlength="36" />
				</a-modal>

				<a-button v-if="${!this.socket.state.connected}" 
					:loading="${this.socket.state.connectionRequested}"
					@click="connectSocket"
					> Connect socket </a-button>
				<a-button v-if="${!this.chat.data.connected}"
					:disabled="${!this.socket.state.connected}"
					:loading="${this.chat.data.connectionRequested}"
					@click="connectChat"
					> Connect chat </a-button>
			</APP>
		`;
    }
    mounted() {
        if (!this.userData.uuid) {
            this.importModalOpened = true;
        }
    }
    confirmUuidImport() {
        if (this.newUuid.match(/........-....-....-....-............/)) {
            this.userData.uuid = this.newUuid;
            localStorage.setItem('uuid', this.newUuid);
            this.importModalOpened = false;
            location.reload();
        }
        else {
            this.importModalOpened = true;
        }
    }
    connectSocket() {
        socket.connect();
    }
    connectChat() {
        chat.connect();
    }
}
__decorate([
    VueTemplate
], AppVue.prototype, "_t", null);
let app = Vue.createApp(AppVue, {
    socket,
    chat,
    userData,
}).use(VuePropDecoratorAVariation.custom)
    .use(VuePropDecoratorAVariation.known)
    .use(antd);
app.mount('#app');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFFckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFHekIsTUFBTSxNQUFPLFNBQVEsWUFBWSxDQUFDO0lBQ2pDLElBQUksRUFBRSxRQUFRO0lBQ2QsUUFBUSxFQUFFLFFBQVE7SUFDbEIsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQztJQUNELGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUMxQixPQUFPLEdBQVMsRUFBRSxDQUFDO0lBRW5CLElBQUksRUFBRTtRQUNMLE9BQU87Ozs7eUJBSWdCLElBQUksQ0FBQyxpQkFBaUI7Ozs7Ozs7Ozs7c0JBVXpCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUztpQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1COzs7c0JBR2hDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUztrQkFDN0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO2lCQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUI7Ozs7R0FJaEQsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsRUFBRTtZQUMvRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ2xDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1lBQy9CLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNsQjthQUFNO1lBQ04sSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztTQUM5QjtJQUNGLENBQUM7SUFDRCxhQUFhO1FBQ1osTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxXQUFXO1FBQ1YsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FDRDtBQWhEQTtJQURDLFdBQVc7Z0NBMkJYO0FBd0JGLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO0lBQy9CLE1BQU07SUFDTixJQUFJO0lBQ0osUUFBUTtDQUNSLENBQUMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDO0tBQ3ZDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7S0FDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGh0dHBzOi8vcmF3LmdpdGhhY2suY29tL0RpbWF2YS9mYWlyLWNsaWVudC9tYXN0ZXIvZGlzdC9pbmRleC5odG1sXHJcblxyXG5sZXQgdXNlckRhdGEgPSBuZXcgVXNlckRhdGEoKTtcclxudXNlckRhdGEudXVpZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd1dWlkJykgfHwgJyc7XHJcblxyXG5sZXQgc29ja2V0ID0gbmV3IEZhaXJTb2NrZXQoKTtcclxuc29ja2V0LnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5sZXQgY2hhdCA9IG5ldyBGYWlyQ2hhdCgpO1xyXG5jaGF0LnNvY2tldCA9IHNvY2tldDtcclxuXHJcbmNoYXQudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcblxyXG5jbGFzcyBBcHBWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGNoYXQ6IEZhaXJDaGF0LFxyXG5cdHVzZXJEYXRhOiBVc2VyRGF0YSxcclxuXHRzb2NrZXQ6IEZhaXJTb2NrZXQsXHJcbn0pIHtcclxuXHRpbXBvcnRNb2RhbE9wZW5lZCA9IGZhbHNlO1xyXG5cdG5ld1V1aWQ6IHV1aWQgPSAnJztcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8QVBQPlxyXG5cdFx0XHRcdDxGYWlyQ2hhdFZ1ZSA6Y2hhdD1cImNoYXRcIiAvPlxyXG5cdFx0XHRcdDxhLW1vZGFsXHJcblx0XHRcdFx0XHRcdHYtbW9kZWw6dmlzaWJsZT1cIiR7dGhpcy5pbXBvcnRNb2RhbE9wZW5lZH1cIlxyXG5cdFx0XHRcdFx0XHR0aXRsZT1cIlVVSUQgaW1wb3J0XCJcclxuXHRcdFx0XHRcdFx0QG9rPVwiY29uZmlybVV1aWRJbXBvcnRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRUaGlzIGNsaWVudCBkb2VzIG5vdCBzdXBwb3J0IG1ha2luZyBpdHMgb3duIHV1aWRzXHJcblx0XHRcdFx0XHQ8YnI+XHJcblx0XHRcdFx0XHRQbGVhc2UgcGFzdGUgeW91ciBVVUlEXHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1V1aWRJbnB1dFwiIHYtbW9kZWw6dmFsdWU9XCJuZXdVdWlkXCIgQHByZXNzRW50ZXI9XCJjb25maXJtVXVpZEltcG9ydFwiIDptYXhsZW5ndGg9XCIzNlwiIC8+XHJcblx0XHRcdFx0PC9hLW1vZGFsPlxyXG5cclxuXHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIiBcclxuXHRcdFx0XHRcdDpsb2FkaW5nPVwiJHt0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRAY2xpY2s9XCJjb25uZWN0U29ja2V0XCJcclxuXHRcdFx0XHRcdD4gQ29ubmVjdCBzb2NrZXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuY2hhdC5kYXRhLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0OmRpc2FibGVkPVwiJHshdGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5jaGF0LmRhdGEuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0QGNsaWNrPVwiY29ubmVjdENoYXRcIlxyXG5cdFx0XHRcdFx0PiBDb25uZWN0IGNoYXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0PC9BUFA+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRtb3VudGVkKCkge1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbmZpcm1VdWlkSW1wb3J0KCkge1xyXG5cdFx0aWYgKHRoaXMubmV3VXVpZC5tYXRjaCgvLi4uLi4uLi4tLi4uLi0uLi4uLS4uLi4tLi4uLi4uLi4uLi4uLykpIHtcclxuXHRcdFx0dGhpcy51c2VyRGF0YS51dWlkID0gdGhpcy5uZXdVdWlkO1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXVpZCcsIHRoaXMubmV3VXVpZCk7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSBmYWxzZTtcclxuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29ubmVjdFNvY2tldCgpIHtcclxuXHRcdHNvY2tldC5jb25uZWN0KCk7XHJcblx0fVxyXG5cdGNvbm5lY3RDaGF0KCkge1xyXG5cdFx0Y2hhdC5jb25uZWN0KCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgYXBwID0gVnVlLmNyZWF0ZUFwcChBcHBWdWUsIHtcclxuXHRzb2NrZXQsXHJcblx0Y2hhdCxcclxuXHR1c2VyRGF0YSxcclxufSkudXNlKFZ1ZVByb3BEZWNvcmF0b3JBVmFyaWF0aW9uLmN1c3RvbSlcclxuXHQudXNlKFZ1ZVByb3BEZWNvcmF0b3JBVmFyaWF0aW9uLmtub3duKVxyXG5cdC51c2UoYW50ZCk7XHJcbmFwcC5tb3VudCgnI2FwcCcpO1xyXG4iXX0=