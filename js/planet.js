document.addEventListener("DOMContentLoaded", function () {
  const elements = document.querySelectorAll(".orbit-dot, .sun-center");
  elements.forEach((element) => {
    element.style.cursor = "pointer";
    const planetName = element.getAttribute("data-planet");
    element.addEventListener("mouseenter", function () {
      const planetName = this.getAttribute("data-planet");
      const planetCard = document.querySelector(
        `.planet-card[data-planet="${planetName}"], .sun-card[data-planet="${planetName}"]`
      );
      if (planetCard) {
        planetCard.classList.add("highlight");
        planetCard.querySelector(".planet-info").style.opacity = "1";
        planetCard.querySelector(".planet-info").style.transform =
          "translateY(0)";
      }
      if (this.classList.contains("orbit-dot")) {
        this.parentElement.classList.add("orbit-active");
      } else if (this.classList.contains("sun-center")) {
        this.classList.add("sun-active");
      }
    });

    element.addEventListener("mouseleave", function () {
      const planetName = this.getAttribute("data-planet");
      const planetCard = document.querySelector(
        `.planet-card[data-planet="${planetName}"], .sun-card[data-planet="${planetName}"]`
      );
      if (planetCard) {
        planetCard.classList.remove("highlight");
        planetCard.querySelector(".planet-info").style.opacity = "0";
        planetCard.querySelector(".planet-info").style.transform =
          "translateY(20px)";
      }
      if (this.classList.contains("orbit-dot")) {
        this.parentElement.classList.remove("orbit-active");
      } else if (this.classList.contains("sun-center")) {
        this.classList.remove("sun-active");
      }
    });

    element.addEventListener("click", function () {
      const planetName = this.getAttribute("data-planet");
      const planetCard = document.querySelector(
        `.planet-card[data-planet="${planetName}"], .sun-card[data-planet="${planetName}"]`
      );
      if (planetCard) {
        planetCard.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        planetCard.classList.add("highlight");
        planetCard.querySelector(".planet-info").style.opacity = "1";
        planetCard.querySelector(".planet-info").style.transform =
          "translateY(0)";
      }
      if (this.classList.contains("orbit-dot")) {
        this.parentElement.classList.add("orbit-active");
        setTimeout(() => {
          this.parentElement.classList.remove("orbit-active");
        }, 3000);
      } else if (this.classList.contains("sun-center")) {
        this.classList.add("sun-active");
        setTimeout(() => {
          this.classList.remove("sun-active");
        }, 3000);
      }
    });
  });
});
