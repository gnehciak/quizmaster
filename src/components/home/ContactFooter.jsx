import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Send, Loader2, Edit, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";

const DEFAULT_CONTENT = {
  title: "Get in touch",
  description: "Have questions about our OC or Selective courses? Need help with enrollment? Our team is here to help you succeed.",
  email: { label: "Email us", value1: "support@quizmaster.edu", value2: "admissions@quizmaster.edu" },
  phone: { label: "Call us", value1: "+61 (02) 1234 5678", value2: "Mon-Fri from 9am to 6pm" },
  address: { label: "Visit us", value1: "123 Education Way,", value2: "Sydney NSW 2000, Australia" },
  footerDesc: "Empowering students to achieve their best in Opportunity Class and Selective High School Placement Tests through authentic practice and expert guidance.",
  links: [
  { label: "OC Trial Tests", url: "#" },
  { label: "Selective Reading", url: "#" },
  { label: "Selective Writing", url: "#" },
  { label: "Thinking Skills", url: "#" }],

  companyLinks: [
  { label: "About Us", url: "#" },
  { label: "Success Stories", url: "#" },
  { label: "Careers", url: "#" },
  { label: "Privacy Policy", url: "#" }]

};

export default function ContactFooter({ content, onUpdate, editMode }) {
  const data = content || DEFAULT_CONTENT;
  const [submitting, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setUploading(false);
    toast.success("Message sent! We'll get back to you shortly.");
    e.target.reset();
  };

  const handleUpdate = (field, value) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleUpdateNested = (parent, field, value) => {
    onUpdate({
      ...data,
      [parent]: { ...data[parent], [field]: value }
    });
  };

  const handleLinkUpdate = (arrayName, index, field, value) => {
    const newArray = [...(data[arrayName] || [])];
    newArray[index] = { ...newArray[index], [field]: value };
    onUpdate({ ...data, [arrayName]: newArray });
  };

  const handleAddLink = (arrayName) => {
    const newArray = [...(data[arrayName] || [])];
    newArray.push({ label: "New Link", url: "#" });
    onUpdate({ ...data, [arrayName]: newArray });
  };

  const handleRemoveLink = (arrayName, index) => {
    const newArray = (data[arrayName] || []).filter((_, i) => i !== index);
    onUpdate({ ...data, [arrayName]: newArray });
  };

  return (
    <>
      {/* Contact Section */}
      <section className="py-24 bg-slate-50 relative group/footer">
        {editMode &&
        <div className="absolute top-4 right-4 z-10">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="shadow-lg gap-2">
                  <Edit className="w-4 h-4" /> Edit Footer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Contact & Footer Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-8 py-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Contact Section</h3>
                    <Label>Title</Label>
                    <Input value={data.title} onChange={(e) => handleUpdate('title', e.target.value)} />
                    <Label>Description</Label>
                    <Textarea value={data.description} onChange={(e) => handleUpdate('description', e.target.value)} />
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2 border p-3 rounded">
                        <Label className="font-semibold">Email Info</Label>
                        <Input value={data.email?.label} onChange={(e) => handleUpdateNested('email', 'label', e.target.value)} placeholder="Label" />
                        <Input value={data.email?.value1} onChange={(e) => handleUpdateNested('email', 'value1', e.target.value)} placeholder="Email 1" />
                        <Input value={data.email?.value2} onChange={(e) => handleUpdateNested('email', 'value2', e.target.value)} placeholder="Email 2" />
                      </div>
                      <div className="space-y-2 border p-3 rounded">
                        <Label className="font-semibold">Phone Info</Label>
                        <Input value={data.phone?.label} onChange={(e) => handleUpdateNested('phone', 'label', e.target.value)} placeholder="Label" />
                        <Input value={data.phone?.value1} onChange={(e) => handleUpdateNested('phone', 'value1', e.target.value)} placeholder="Phone" />
                        <Input value={data.phone?.value2} onChange={(e) => handleUpdateNested('phone', 'value2', e.target.value)} placeholder="Hours" />
                      </div>
                      <div className="space-y-2 border p-3 rounded">
                        <Label className="font-semibold">Address Info</Label>
                        <Input value={data.address?.label} onChange={(e) => handleUpdateNested('address', 'label', e.target.value)} placeholder="Label" />
                        <Input value={data.address?.value1} onChange={(e) => handleUpdateNested('address', 'value1', e.target.value)} placeholder="Line 1" />
                        <Input value={data.address?.value2} onChange={(e) => handleUpdateNested('address', 'value2', e.target.value)} placeholder="Line 2" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Footer Content</h3>
                    <Label>Footer Description</Label>
                    <Textarea value={data.footerDesc} onChange={(e) => handleUpdate('footerDesc', e.target.value)} />
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Program Links</Label>
                          <Button size="sm" variant="ghost" onClick={() => handleAddLink('links')}><Plus className="w-3 h-3" /></Button>
                        </div>
                        {data.links?.map((link, i) =>
                      <div key={i} className="flex gap-2">
                            <Input value={link.label} onChange={(e) => handleLinkUpdate('links', i, 'label', e.target.value)} placeholder="Label" />
                            <Input value={link.url} onChange={(e) => handleLinkUpdate('links', i, 'url', e.target.value)} placeholder="URL" />
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveLink('links', i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                      )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Company Links</Label>
                          <Button size="sm" variant="ghost" onClick={() => handleAddLink('companyLinks')}><Plus className="w-3 h-3" /></Button>
                        </div>
                        {data.companyLinks?.map((link, i) =>
                      <div key={i} className="flex gap-2">
                            <Input value={link.label} onChange={(e) => handleLinkUpdate('companyLinks', i, 'label', e.target.value)} placeholder="Label" />
                            <Input value={link.url} onChange={(e) => handleLinkUpdate('companyLinks', i, 'url', e.target.value)} placeholder="URL" />
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveLink('companyLinks', i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">{data.title}</h2>
              <p className="text-lg text-slate-600 mb-10">
                {data.description}
              </p>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{data.email?.label || "Email us"}</h3>
                    <p className="text-slate-600">{data.email?.value1}</p>
                    <p className="text-slate-600">{data.email?.value2}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{data.phone?.label || "Call us"}</h3>
                    <p className="text-slate-600">{data.phone?.value1}</p>
                    <p className="text-sm text-slate-500 mt-1">{data.phone?.value2}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{data.address?.label || "Visit us"}</h3>
                    <p className="text-slate-600">{data.address?.value1}</p>
                    <p className="text-slate-600">{data.address?.value2}</p>
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
                <span className="text-xl font-bold text-white">WWW Writing College Online</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                {data.footerDesc}
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Programs</h4>
              <ul className="space-y-2">
                {data.links?.map((link, i) =>
                <li key={i}><a href={link.url} className="hover:text-white transition-colors">{link.label}</a></li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Join our Engaging Classes</h4>
              <ul className="space-y-2">
                {data.companyLinks?.map((link, i) =>
                <li key={i}><a href={link.url} className="hover:text-white transition-colors">{link.label}</a></li>
                )}
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
    </>);

}