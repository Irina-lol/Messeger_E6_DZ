const chatContainer = document.querySelector(".chat-list");
const messageContainer = document.querySelector(".message-list");
const selectedChatId = document.querySelector("#selected-chat-id");
const authorId = document.querySelector("#author-id");
const formMessageSender = document.querySelector("#message-sender");
const btnShowCreateChatDialog = document.querySelector("#chat-create");
const messageEditor = document.querySelector('textarea[name="text"]');
const formChatCreator = document.querySelector("#chat-creator");
const btnShowRecruitChatDialog = document.querySelector("#recruit-chat");
const dialog = document.querySelector("#manage-chat-dialog");
let selectedChat = chatContainer.firstElementChild;
let chatSocket;


const chats = chatContainer.children;
for (var i = 0; i < chats.length; ++i) {
  chats[i].addEventListener("click", selectChat);
}


function firstDefault() {
  selectedChat = chatContainer.firstElementChild;
  if (selectedChat) {
    selectedChat.click();
    selectedChat.className = "chat-list_item-selected";
  }
}
firstDefault();


function wsOpen() {
  if (selectedChat) {
    if (chatSocket) {chatSocket.close();}

    chatSocket = new WebSocket(
      `ws:
    );

    chatSocket.onclose = function(e) {
      console.log(`Код: ${e.code} причина: ${e.reason}/${e.wasClean ? "Соединение закрыто чисто" : "Обрыв соединения"}`);
    }

    chatSocket.onmessage = function(e) {
      const data = JSON.parse(e.data);
      switch(data.message.type) {
        case 'message':
          switch(data.message.action) {
            case 'create':
              showMessage(data.message.parcel);
              break;
            case 'delete':
              const message = document.getElementById(`message-id-${data.message.parcel.id}`);
              if (message) {message.remove();}
              break;
          }
          break;
        case 'chat':
          const chat = document.getElementById(`chat-list_item-${data.message.parcel.id}`);
          switch (data.message.action) {
            case "create":
                const members = data.message.parcel.members;
                if (members.indexOf(parseInt(authorId.value)) > -1) {
                  showChat(data.message.parcel);
                  if (data.message.initiator == authorId.value) {firstDefault();} 
                }
              break;
            case "delete":
              if (chat) {
                chat.remove();
                if (!selectedChat) {firstDefault();}
              } 
              break;
            case "update":
              console.log(data);
              if (chat) {
                chat.innerHTML = `<h4>${data.message.parcel.title}</h4>`;
                chat.setAttribute('members', data.message.parcel.members_list);
              }
              const meInMembers = data.message.parcel.members.indexOf(parseInt(authorId.value));
              if ((meInMembers > -1) && (!chat)) {
                showChat(data.message.parcel);
              } 
              if ((meInMembers == -1) && (chat)) {
                chat.remove();
              }
              break;
          }          
          break;
      }
    }
  }
}


function selectChat() {
  fetch(`/api/message/?chat_id=${this.getAttribute("chat-id")}`)
  .then((response) => response.json())
  .then((messages) => {
    showMessages(messages);
  })
  .catch((error) => console.error("Error:", error));
  selectedChat.className = "chat-list_item";
  selectedChat = this;
  selectedChat.className = "chat-list_item-selected";
  selectedChatId.value = this.getAttribute("chat-id");
  wsOpen();
}


function showMessages(messages) {
  messageContainer.innerHTML = "";
  messages.forEach((message) => {
    messageContainer.append(prepareMessage(message));
  });
  messageContainer.scrollTop = messageContainer.clientHeight;
}


function showMessage(message) {
  messageContainer.append(prepareMessage(message));
  messageContainer.scrollTop = messageContainer.clientHeight;
}


function prepareMessage(m) {
  let message = document.createElement("div");
  message.className = `message-panel ${m.author == authorId.value ? "shift" : "unshift"}`;
  message.id = `message-id-${m.id}`;

  let messageBox = document.createElement("div");
  messageBox.className = `message-box ${m.author == authorId.value ? "own-box" : "another-box"}`;

  let author = document.createElement("div")
  author.className = "author-info";

  let nickname = document.createElement("span");
  nickname.appendChild(document.createTextNode(m.nickname ?? m.authorName));

  let avatar = document.createElement("img");
  avatar.src = m.avatar;

  author.appendChild(avatar);
  author.appendChild(nickname);

  let text = document.createElement("span");
  text.className = "message-text";
  text.appendChild(document.createTextNode(m.text));

  let timeInfo = document.createElement("span");
  timeInfo.className = "time-info";
  timeInfo.appendChild(document.createTextNode(m.dateCreation));
  let buttonDelete = document.createElement("button");
  buttonDelete.className = "tiny-button";
  buttonDelete.style.display = `${m.author == authorId.value ? "block" : "none"}`;
  buttonDelete.appendChild(document.createTextNode("удалить"));
  buttonDelete.addEventListener("click", () => {deleteMessage(m.id);});
  timeInfo.appendChild(buttonDelete);

  messageBox.appendChild(author);
  messageBox.appendChild(text);
  messageBox.appendChild(timeInfo);

  message.appendChild(messageBox);
  return message;
}


function deleteMessage(id) {
  const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
  fetch(`/api/message/${id}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
  }).then(() => {
    chatSocket.send(
      JSON.stringify({
        type: "message",
        action: "delete",
        parcel: {"id": id},
      })
    );
  });
}


function sendMessage(messageText) {
  if (selectedChatId.value.length == 0) {
    alert("Необходмо выбрать чат прежде, чем отправлять сообщение");
  } else {
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    fetch(`/api/message/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        text: messageText,
        author: authorId.value,
        chat: selectedChatId.value,
        deleted: false,
      }),
    })
    .then((response) => response.json())
    .then((json) => {
      chatSocket.send(JSON.stringify({
        type: "message",
        action: "create",
        parcel: json,
      }));
    })
    .catch((error) => console.error("Error:", error));
  }
}


formMessageSender.onsubmit = function (ev) {
  sendMessage(messageEditor.value);
  messageEditor.value = "";
  return false;
};


btnShowCreateChatDialog.addEventListener("click", (ev) => {
  const m = [parseInt(authorId.value)];
  fillUserCheckList(m); 

  document.querySelector('input[id="chat-title"]').value = "";

  dialog.setAttribute("target", ev.target.id);
  dialog.setAttribute("members", m);
  dialog.classList.remove("hidden");
});


btnShowRecruitChatDialog.addEventListener("click", (ev) => {
  const m = getMembersList();
  fillUserCheckList(m); 

  document.querySelector('input[id="chat-title"]').value = document.querySelector(`div[chat-id="${selectedChatId.value}"]`).textContent.trim();

  dialog.setAttribute("target", ev.target.id);
  dialog.setAttribute("members", m);
  dialog.classList.remove("hidden");
});


function fillUserCheckList(exclude) {
  fetch(`/api/users/`)
  .then((response) => response.json())
  .then((users) => {
    let s = "";
    users.forEach((user) => {
      if (exclude.indexOf(user.id) == -1) {
        s += `<div><input type="checkbox" id="user-${user.id}" name="chbUser" value="${user.username}" />`;
        s += `<label for="user-${user.id}">${user.profile ?? user.username}</label></div>`;
      }
      document.getElementById("user-list").innerHTML = s;
    });
  })
  .catch((error) => console.error("Error:", error));
}


document.querySelector("#chat-destroy").addEventListener("click", () => {
  if (selectedChatId.value.length == 0) {
    alert("Необходмо выбрать чат прежде, чем удалить его");
  } else {
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    fetch(`/api/chat/${selectedChatId.value}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
    }).then(() => {
      chatSocket.send(
        JSON.stringify({
          type: "chat",
          action: "delete",
          initiator: authorId.value,
          parcel: { id: selectedChatId.value, members: getMembersList() }
        })
      );
    });    
  }   
});


function getMembersList() {
  const chat_members = document.getElementById(`chat-list_item-${selectedChatId.value}`).getAttribute("members") ?? "";
  const m = chat_members.replaceAll(' ', '').replaceAll('[', '').replaceAll(']', '').split(',').map((item) => parseInt(item));
  return m;
}


document.querySelector("#dialog-box__cancel").addEventListener("click", (ev) => {
  dialog.classList.add("hidden");
});


function validateChat() {
  const result = {
    chatName: document.querySelector('input[id="chat-title"]').value,
    checked: dialog.getAttribute('members').split(","),
    recruited: [],
    currentChatName: document.querySelector(`div[chat-id="${selectedChatId.value}"]`)?.textContent.trim()
  };

  const checkBoxes = document.getElementsByName("chbUser");
  checkBoxes.forEach((item, i) => {
    if (item.checked) {
      result.checked.push(item.id.replace("user-", ""));
      result.recruited.push(document.querySelector(`label[for="${item.id}"]`).textContent);
    }
  });

  if (result.checked.length < 2) {
    alert("Необходимо добавить хотя бы одного собеседника");
    return {}; 
  } else if (result.chatName.length == 0) {
    alert("Необходимо указать наименование");
    return {};
  } else {
    return result;
  }
}


function createChat(title, members) {
  const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

  fetch(`/api/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({
      title: title,
      members: members,
    }),
  })
  .then((response) => response.json())
  .then((json) => {
    chatSocket.send(
      JSON.stringify({
        type: "chat",
        action: "create",
        initiator: authorId.value,
        parcel: json
      })
    );      
  })
  .catch((error) => console.error("Error:", error));
  return true;
}


function updateChat(title, members) {
  const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

  fetch(`/api/chat/${selectedChatId.value}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken
    },
    credentials: "include",
    body: JSON.stringify({
      id: selectedChatId.value,
      title: title,
      members: members
    })
  })
  .then((response) => response.json())
  .then((json) => {
    chatSocket.send(
      JSON.stringify({
        type: "chat",
        action: "update",
        initiator: authorId.value,
        parcel: json
      })
    );
  })
  .catch((error) => console.error("Error:", error));
  return true;
}


document.querySelector("#dialog-box__ok").addEventListener("click", (ev) => {
  let result = false;
  const validated = validateChat();
  if (Object.keys(validated).length > 0) {
    switch(dialog.getAttribute('target')) {
      case "chat-create": 
        result = createChat(validated.chatName, validated.checked); 
        break;
      case "recruit-chat": 
        let messageText = validated.recruited.length > 0 ? `В чат добавлены пользователи: ${validated.recruited.join(", ")}.` : "";
        messageText += validated.chatName != validated.currentChatName ? `Наименование чата изменено на "${validated.chatName}".` : "";

        if (messageText.length > 0) {
          result = updateChat(validated.chatName, validated.checked); 
          sendMessage(messageText);
        }
        break;
    }
  }
  if (result) dialog.classList.add("hidden");
});


function showChat(chat) {
  const chatElement = document.getElementById(`chat-list_item-${chat.id}`);
  if (!chatElement) {
    const newChat = chatContainer.insertBefore(prepareChat(chat), chatContainer.firstChild);
    newChat.addEventListener("click", selectChat);
  } 
}


function prepareChat(c) {
  let chatItem = document.createElement("div");
  chatItem.id = `chat-list_item-${c.id}`;
  chatItem.className = "chat-list_item";
  chatItem.setAttribute("chat-id", c.id);
  chatItem.setAttribute("members", c.members_list);
  let chatTitle = document.createElement("h4");
  chatTitle.appendChild(document.createTextNode(c.title));
  chatItem.appendChild(chatTitle);
  return chatItem;
}


messageEditor.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.keyCode === 13) {
    document.querySelector("#message-sender-button").click();
  }  
});


document.querySelector("#leave-chat").addEventListener("click", (ev) => {
    const members = getMembersList();
    const chat = document.querySelector(`div[chat-id="${selectedChatId.value}"]`);
    const title = chat.textContent.trim();
    const meInMembers = members.indexOf(parseInt(authorId.value));

    if (meInMembers > -1) {
      members.splice(meInMembers, 1);
      sendMessage('Покидаю чат');
      updateChat(title, members);
    }
  
})