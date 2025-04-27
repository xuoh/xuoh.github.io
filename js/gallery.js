const list = [
  {
    images: "images/0.jpg",
    introduce: "彩虹",
    category: "other",
  },
  {
    images: "images/1.jpg",
    introduce: "宇宙的奥秘",
    category: "universe",
  },
  {
    images: "images/2.jpg",
    introduce: "太空船",
    category: "universe",
  },
  {
    images: "images/3.jpg",
    introduce: "進擊的巨人",
    category: "other",
  },
  {
    images: "images/4.png",
    introduce: "星空之下",
    category: "universe",
  },
  {
    images: "images/5.png",
    introduce: "黄昏的教室",
    category: "other",
  },
  {
    images: "images/6.jpg",
    introduce: "宇宙的奥秘",
    category: "universe",
  },
  {
    images: "images/7.jpg",
    introduce: "夜观钟楼",
    category: "university",
  },
  {
    images: "images/8.jpg",
    introduce: "日落文澜",
    category: "university",
  },
  {
    images: "images/9.jpg",
    introduce: "花开文波",
    category: "university",
  },
];

let currentIndex = 0;

function initGallery() {
  const galleryContainer = document.getElementById("galleryContainer");
  galleryContainer.innerHTML = "";

  list.forEach((item, index) => {
    const galleryItem = document.createElement("div");
    galleryItem.classList.add("gallery-item");
    galleryItem.setAttribute("data-category", item.category);
    galleryItem.setAttribute("data-index", index);

    const galleryImage = document.createElement("div");
    galleryImage.classList.add("gallery-image");
    const img = document.createElement("img");
    img.src = item.images;
    img.alt = item.introduce;
    galleryImage.appendChild(img);

    const galleryOverlay = document.createElement("div");
    galleryOverlay.classList.add("gallery-overlay");
    const galleryInfo = document.createElement("div");
    galleryInfo.classList.add("gallery-info");
    const title = document.createElement("h3");
    title.textContent = item.introduce;
    const desc = document.createElement("p");
    desc.textContent = "点击查看大图";
    galleryInfo.appendChild(title);
    galleryInfo.appendChild(desc);
    galleryOverlay.appendChild(galleryInfo);

    galleryItem.appendChild(galleryImage);
    galleryItem.appendChild(galleryOverlay);

    galleryItem.addEventListener("click", () => openModal(index));

    galleryContainer.appendChild(galleryItem);
  });
}

function filterGallery(category) {
  const items = document.querySelectorAll(".gallery-item");
  items.forEach((item) => {
    if (category === "all" || item.getAttribute("data-category") === category) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

function openModal(index) {
  currentIndex = index;
  const modal = document.getElementById("galleryModal");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");

  const item = list[index];
  modalImage.src = item.images;
  modalImage.alt = item.introduce;
  modalTitle.textContent = item.introduce;

  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("galleryModal");
  modal.style.display = "none";
}

function showPrev() {
  currentIndex = (currentIndex - 1 + list.length) % list.length;
  openModal(currentIndex);
}

function showNext() {
  currentIndex = (currentIndex + 1) % list.length;
  openModal(currentIndex);
}

function initEventListeners() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const filter = button.getAttribute("data-filter");
      filterGallery(filter);
    });
  });

  document.getElementById("closeModal").addEventListener("click", closeModal);

  document.getElementById("modalPrev").addEventListener("click", showPrev);
  document.getElementById("modalNext").addEventListener("click", showNext);

  document.getElementById("galleryModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("galleryModal")) {
      closeModal();
    }
  });
}

window.onload = () => {
  initGallery();
  initEventListeners();
};
