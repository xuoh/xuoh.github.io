// 平滑滚动到页脚
document.querySelector(".scroll-down").addEventListener("click", function (e) {
  e.preventDefault();
  document.querySelector("#footer").scrollIntoView({
    behavior: "smooth",
  });
});
