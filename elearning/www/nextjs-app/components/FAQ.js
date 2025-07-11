import React, { useState } from 'react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "Có thể đăng ký nhiều khóa học cùng lúc không?",
      answer: "Hoàn toàn có thể! Bạn có thể đăng ký nhiều khóa học cùng lúc và truy cập chúng theo sự tiện ích của mình.",
      linkText: "Quy trình đăng ký cho các khóa học khác nhau",
      linkUrl: "#"
    },
    {
      question: "Loại hỗ trợ nào tôi có thể mong đợi từ giáo viên?",
      answer: "Giáo viên của chúng tôi cung cấp hỗ trợ toàn diện bao gồm các phản hồi nhanh chóng đối với câu hỏi, đánh giá chi tiết về bài tập và các cuộc họp thẳng để làm rõ và thảo luận.",
      linkText: "",
      linkUrl: ""
    },
    {
      question: "E-learning có khả dụng trong các ngôn ngữ khác nhau không?",
      answer: "Có, E-learning có sẵn trong tiếng Anh, tiếng Việt và tiếng Ý để phục vụ cho các học sinh đa dạng.",
      linkText: "",
      linkUrl: ""
    }
  ];

  return (
    <section className="py-16 bg-[#F6FAFF]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold mb-4">Câu hỏi thường gặp</h2>
            <p className="text-gray-600 mb-8">
              Vẫn còn câu hỏi? Liên hệ với đội ngũ của chúng tôi qua support@skillbridge.com
            </p>
            <button className="bg-white text-gray-800 px-6 py-3 rounded-md shadow-sm hover:shadow-md transition duration-300 font-medium">
              Xem tất cả câu hỏi thường gặp
            </button>
          </div>
          
          <div className="md:col-span-3">
            {faqs.map((faq, index) => (
              <div key={index} className="mb-4">
                <div 
                  className={`p-5 rounded-lg mb-2 ${openIndex === index ? 'bg-white shadow-lg' : 'bg-white shadow-sm'}`}
                >
                  <div 
                    className="flex justify-between items-center w-full text-left font-medium cursor-pointer"
                    onClick={() => toggleFAQ(index)}
                  >
                    <h3 className="text-gray-800">{faq.question}</h3>
                    <button className="flex items-center justify-center w-10 h-10 bg-[#FEF7F0] rounded-md">
                      {openIndex === index ? (
                        <svg className="h-4 w-4 text-gray-800 font-bold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-800 font-bold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4V20M20 12L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {openIndex === index && (
                    <div className="mt-3">
                      <p className="text-gray-600">{faq.answer}</p>
                      
                      {faq.linkText && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                          <span className="text-gray-800 font-medium">{faq.linkText}</span>
                          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm">
                            <svg className="h-5 w-5 text-gray-800 font-bold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ; 