const commentForm = document.getElementById("commentForm");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");
const commentsList = document.getElementById("commentsList");

commentForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) {
    alert("昵称和留言内容不能为空！");
    return;
  }

  const now = new Date();
  const dateString = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")} ${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const newComment = document.createElement("div");
  newComment.className = "comment";
  newComment.innerHTML = `
    <div class="comment-header">
      <span class="comment-author">${name}</span>
      <span class="comment-date">${dateString}</span>
    </div>
    <div class="comment-content">${message.replace(/\n/g, "<br>")}</div>
  `;

  const noComments = commentsList.querySelector(".no-comments");
  if (noComments) {
    noComments.remove();
  }

  commentsList.insertBefore(newComment, commentsList.firstChild);

  nameInput.value = "";
  messageInput.value = "";

  newComment.scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("DOMContentLoaded", function () {
  const savedComments = localStorage.getItem("comments");
  if (savedComments) {
    try {
      const comments = JSON.parse(savedComments);
      if (comments.length > 0) {
        commentsList.innerHTML = "";
        comments.forEach((comment) => {
          const commentEl = document.createElement("div");
          commentEl.className = "comment";
          commentEl.innerHTML = `
            <div class="comment-header">
              <span class="comment-author">${comment.name}</span>
              <span class="comment-date">${comment.date}</span>
            </div>
            <div class="comment-content">${comment.message}</div>
          `;
          commentsList.appendChild(commentEl);
        });
      }
    } catch (e) {
      console.error("加载留言失败:", e);
    }
  }
});

function saveComments() {
  const comments = [];
  document.querySelectorAll(".comment").forEach((commentEl) => {
    const name = commentEl.querySelector(".comment-author").textContent;
    const date = commentEl.querySelector(".comment-date").textContent;
    const message = commentEl.querySelector(".comment-content").innerHTML;
    comments.push({ name, date, message });
  });
  localStorage.setItem("comments", JSON.stringify(comments));
}

commentForm.addEventListener("submit", function () {
  setTimeout(saveComments, 100);
});
