document.addEventListener("DOMContentLoaded", function () {
  function one() {
    fetch("https://v1.hitokoto.cn/")
      .then((response) => response.json())

      .then((data) => {
        document.getElementById("hitokoto").innerText = data.hitokoto;
        setTimeout(one, 1000);
      })

      .catch(console.error);
  }
  setTimeout(one, 0);
});
