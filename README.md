# 🌊 River Water Plastic Detection using YOLOv8 and React

This project detects plastic waste floating in river water using a custom-trained **YOLOv8 deep learning model** and displays the results through an interactive **React-based frontend**.

---

## 🧠 Project Overview

Plastic pollution in water bodies is one of the biggest threats to marine ecosystems.
This project aims to **automatically detect and classify plastic waste** in river water images using **computer vision and deep learning**.

---

## 🧩 Tech Stack

**Frontend:** React.js
**Backend:** Python (Flask/FastAPI – optional)
**Model:** YOLOv8 (custom trained for 100 epochs)
**Dataset:** Custom dataset of river plastic images
**Environment:** Python 3.10+, Node.js 18+

---

## 🚀 Features

* Real-time detection of plastic in river images
* Easy-to-use web interface built with React
* Custom-trained YOLOv8 model for better accuracy
* Option to upload images and view detection results

---

## 🧱 Folder Structure

```
river-water-plastic-detection/
│
├── frontend/       # React UI
├── backend/        # Python API (optional)
├── yolov8_model/   # YOLOv8 model + weights
├── README.md
└── .gitignore
```

---


### 2️⃣ Setup Frontend

```bash
cd frontend
npm install
npm start
```

### 3️⃣ Setup Backend (if using)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 4️⃣ Run YOLOv8 Detection (optional)

```bash
cd yolov8_model
yolo detect predict model=best.pt source=your_image.jpg
```

---

## 🖼️ Screenshots

*Add screenshots of your web app here:*

```
/screenshots/
   ├── homepage.png
   ├── detection_result.png
```

---

## 📊 Model Training Details

* **Base Model:** YOLOv8s
* **Epochs:** 100
* **Optimizer:** Adam
* **Input Size:** 640x640
* **Dataset:** Custom images of river plastic
* **mAP:** (Add your model’s accuracy here)

---

## 🧩 Future Improvements

* Add live camera detection
* Deploy model to cloud (Hugging Face / Render)
* Improve dataset with real-world images
* Create API for mobile integration

---

## 🧑‍💻 Author

**Sangharsh Nikam**
📧 [nikam.sangharsh.anil@gmail.com]
⭐ Don’t forget to star this repo if you like it!

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
