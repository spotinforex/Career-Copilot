import { UploadResponse } from '../types';

export const initialSampleResume: UploadResponse = {
  s3_key: "uploads/0cbff955-24fb-478e-abea-838609b02b94/7a6dd0b6-2e10-4609-89a8-66ed2488f04b_Machine_Learning_Resume_Praisejah.pdf",
  resume_id: "ddfc440b-2e43-4fa6-9eab-4beed90cfee6",
  content: {
    "Bio Info": [
      "Name: Praisejah Nwabeke",
      "Title: Machine Learning Resume",
      "Location: Aba, Abia State, Nigeria",
      "Phone: +2348146072877",
      "Email: nwabekepraisejah@gmail.com",
      "GitHub: https://github.com/yourusername",
      "LinkedIn: https://linkedin.com/in/yourprofile"
    ],
    summary: "Data Scientist and Machine Learning enthusiast with hands-on experience in predictive modeling, time series forecasting, and end-to-end ML pipeline development. Skilled in Python, SQL, and data visualization. Proficient in tools like Scikit-learn, TensorFlow, and Streamlit. Strong foundation in statistics and real-world problem-solving, currently working on customer churn prediction and hybrid trading models.",
    experience: [
      {
        title: "Customer Churn Prediction App",
        description: "Built full ML pipeline with Streamlit frontend. Used CatBoost, handled class imbalance, encoded categoricals. Deployed interactive dashboard for real-time predictions."
      },
      {
        title: "Hybrid Trading Pipeline (In Progress)",
        description: "Combines quantitative signals with discretionary overrides. Uses Flask for override interface and real-time data ingestion."
      },
      {
        title: "Nigerian Budget Deficit Analysis",
        description: "Time series modeling using Prophet and ARIMA. Analyzed GDP trends and projected economic impact."
      }
    ],
    education: [
      {
        degree: "B.Sc. in Public Administration",
        institution: "University of Nigeria, Nsukka",
        years: "2021 - 2025",
        relevant_coursework: [
          "Government Accounting",
          "Policy Analysis",
          "Quantitative Methods"
        ]
      }
    ],
    skills: [
      "Python", "SQL", "R", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "Keras",
      "XGBoost", "CatBoost", "Prophet", "ARIMA", "Jupyter", "Git", "Docker", "Streamlit",
      "Supabase", "Flask", "Airflow", "Kafka", "PostgreSQL", "MySQL", "GitHub Actions",
      "REST APIs", "Time Series Analysis", "EDA", "Feature Engineering", "Model Deployment",
      "MLOps", "Supervised & Unsupervised Learning", "Time Series Forecasting", "Critical Thinking & Data Storytelling"
    ]
  },
  message: "Hey Praisejah! Thanks for sharing your resume.\n\nIt looks like you've got a really solid foundation in data science and machine learning—especially with practical, end-to-end projects like your customer churn app and time series forecasting. Your technical toolkit is also super comprehensive.\n\nWhenever you're ready, let me know what you'd like to do next—whether you want to tailor this into a dedicated software engineering CV, update your career goals, or prep for applications!"
};
