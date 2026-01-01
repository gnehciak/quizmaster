import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactFooter() {
  const [submitting, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setUploading(false);
    toast.success("Message sent! We'll get back to you shortly.");
    e.target.reset();
  };

  return (
    <>
      {/* Contact Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Get in touch</h2>
              <p className="text-lg text-slate-600 mb-10">
                Have questions about our OC or Selective courses? Need help with enrollment? Our team is here to help you succeed.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Email us</h3>
                    <p className="text-slate-600">support@quizmaster.edu</p>
                    <p className="text-slate-600">admissions@quizmaster.edu</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Call us</h3>
                    <p className="text-slate-600">+61 (02) 1234 5678</p>
                    <p className="text-sm text-slate-500 mt-1">Mon-Fri from 9am to 6pm</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Visit us</h3>
                    <p className="text-slate-600">123 Education Way,</p>
                    <p className="text-slate-600">Sydney NSW 2000, Australia</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Send us a message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">First Name</label>
                    <Input required placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                    <Input required placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input required type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Message</label>
                  <Textarea required placeholder="How can we help you?" className="min-h-[120px]" />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  Q
                </div>
                <span className="text-xl font-bold text-white">QuizMaster</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Empowering students to achieve their best in Opportunity Class and Selective High School Placement Tests through authentic practice and expert guidance.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Programs</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">OC Trial Tests</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Selective Reading</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Selective Writing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Thinking Skills</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} QuizMaster Education. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}