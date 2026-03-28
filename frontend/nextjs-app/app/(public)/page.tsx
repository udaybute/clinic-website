import HeroSection            from "@/components/home/HeroSection"
import StatsSection           from "@/components/home/StatsSection"
import WhyChooseUsSection     from "@/components/home/WhyChooseUsSection"
import ServicesPreviewSection from "@/components/home/ServicesPreviewSection"
import DoctorsSection         from "@/components/home/DoctorsSection"
import AIAssistantSection     from "@/components/home/AIAssistantSection"
import SmileGallerySection    from "@/components/home/SmileGallerySection"
import TestimonialsSection    from "@/components/home/TestimonialsSection"
import FAQSection             from "@/components/home/FAQSection"
import LocationSection        from "@/components/home/LocationSection"

export default function Home() {
  return (
    <main>
      {/* 1. Above the fold */}
      <HeroSection />
      {/* 2. Proof numbers */}
      <StatsSection />
      {/* 3. Why choose us — patient-facing reasons */}
      <WhyChooseUsSection />
      {/* 4. Services + pricing */}
      <ServicesPreviewSection />
      {/* 5. Doctor profiles */}
      <DoctorsSection />
      {/* 6. AI chatbot demo */}
      <AIAssistantSection />
      {/* 7. Before / After gallery */}
      <SmileGallerySection />
      {/* 8. Patient testimonials */}
      <TestimonialsSection />
      {/* 9. FAQ accordion */}
      <FAQSection />
      {/* 10. Map + contact */}
      <LocationSection />
    </main>
  )
}