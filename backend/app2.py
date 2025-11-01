import streamlit as st
from ultralytics import YOLO
from PIL import Image
import os

# Load the trained model (put the correct path)
model = YOLO('D:/plastic_detection_project/best.pt')

st.title("Plastic Waste Detection")
st.write("Upload an image to detect plastics in it.")

uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    image = Image.open(uploaded_file)
    st.image(image, caption='Uploaded Image', use_column_width=True)
    st.write("Detecting plastics...")

    # Run the model prediction
    results = model.predict(source=image, conf=0.25)
    result_img = results[0].plot()  # Get annotated image (use plot method)

    st.image(result_img, caption='Detected Plastics', use_column_width=True)
