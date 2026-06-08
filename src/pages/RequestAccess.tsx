import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../utils/db';
import { 
  Building, 
  User, 
  Mail, 
  Phone, 
  Image as ImageIcon, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export const RequestAccess: React.FC = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    logo_url: '',
    crm_name: '',
    plan: 'starter' as 'starter' | 'growth' | 'enterprise'
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const compressAndSetLogo = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          callback(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetLogo(e.dataTransfer.files[0], (base64) => {
        setFormData(prev => ({ ...prev, logo_url: base64 }));
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetLogo(e.target.files[0], (base64) => {
        setFormData(prev => ({ ...prev, logo_url: base64 }));
      });
    }
  };

  const triggerFileSelect = () => {
    document.getElementById('logo-upload-input')?.click();
  };

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter Tier',
      price: '$99/mo',
      desc: 'Great for small agency teams',
      color: 'rgba(59, 130, 246, 0.2)'
    },
    {
      id: 'growth' as const,
      name: 'Growth Tier',
      price: '$249/mo',
      desc: 'Perfect for mid-sized scale',
      color: 'rgba(139, 92, 246, 0.2)'
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise Tier',
      price: 'Custom',
      desc: 'Dedicated setup & support',
      color: 'rgba(16, 185, 129, 0.2)'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!formData.company_name.trim()) throw new Error('Company name is required');
      if (!formData.contact_name.trim()) throw new Error('Contact name is required');
      if (!formData.email.trim()) throw new Error('Email address is required');
      
      await db.subscriptionRequests.create({
        company_name: formData.company_name.trim(),
        contact_name: formData.contact_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        logo_url: formData.logo_url.trim() || undefined,
        crm_name: formData.crm_name.trim() || undefined,
        plan: formData.plan
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={containerStyle} className="anim-fade">
        <div style={floatingGradientStyle}></div>
        <div style={floatingGradientStyle2}></div>

        <div className="glass-panel" style={successCardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={successIconWrapper}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)' }} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h2 style={titleStyle}>Request Submitted!</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                Thank you for your request. Our system superadmins will review your company details and provision your tenant space shortly. 
                We will email you at <strong>{formData.email}</strong> once your admin dashboard is ready.
              </p>
            </div>

            <Link to="/login" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="anim-fade">
      <div style={floatingGradientStyle}></div>
      <div style={floatingGradientStyle2}></div>

      <div className="glass-panel" style={cardStyle}>
        <div style={backLinkWrapper}>
          <Link to="/login" style={backLinkStyle}>
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </div>

        <div style={headerStyle}>
          <div style={logoWrapperStyle}>
            <Sparkles size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={titleStyle}>Request Arise CRM Access</h2>
          <p style={subTitleStyle}>Register your company & request tenant workspace setup</p>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          
          <div style={gridStyle}>
            {/* Left Col - Company details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <div style={inputWrapperStyle}>
                  <Building size={16} style={inputIconStyle} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. Acme Corp"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Custom CRM Brand Name (Optional)</label>
                <div style={inputWrapperStyle}>
                  <Sparkles size={16} style={inputIconStyle} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. Acme CRM"
                    value={formData.crm_name}
                    onChange={(e) => setFormData({ ...formData, crm_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Right Col - Company Logo Dropzone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span className="form-label">Company Logo</span>
              <div 
                style={dropZoneStyle(dragActive)}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <input 
                  type="file" 
                  id="logo-upload-input" 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
                {formData.logo_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                    <img 
                      src={formData.logo_url} 
                      alt="Logo Preview" 
                      style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-ghost" 
                      style={{ fontSize: '0.75rem', color: '#f87171', padding: '0.2rem 0.5rem' }}
                      onClick={() => setFormData({ ...formData, logo_url: '' })}
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', textAlign: 'center' }}>
                    <ImageIcon size={24} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {dragActive ? 'Drop file here' : 'Upload logo image'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Drag & drop or click to browse
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          <div style={gridStyle}>
            <div className="form-group">
              <label className="form-label">Contact Full Name *</label>
              <div style={inputWrapperStyle}>
                <User size={16} style={inputIconStyle} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="John Doe"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <div style={inputWrapperStyle}>
                <Phone size={16} style={inputIconStyle} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="+1 (555) 019-2834"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Login Email Address *</label>
            <div style={inputWrapperStyle}>
              <Mail size={16} style={inputIconStyle} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              This email will serve as your superadmin / company setup contact.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '0.75rem' }}>Choose Subscription Plan *</label>
            <div style={plansGridStyle}>
              {plans.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setFormData({ ...formData, plan: p.id })}
                  style={planCardStyle(formData.plan === p.id, p.color)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                    <span style={priceBadgeStyle}>{p.price}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={saving}
          >
            {saving ? 'Submitting request...' : 'Submit Setup Request'}
          </button>

        </form>
      </div>
    </div>
  );
};

// --- STYLES ---
const dropZoneStyle = (active: boolean): React.CSSProperties => ({
  height: '144px',
  background: active ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
  border: active ? '1px dashed var(--primary)' : '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.25rem',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  position: 'relative'
});

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  width: '100vw',
  background: 'var(--bg-app)',
  padding: '2rem',
  position: 'relative',
  overflow: 'hidden',
};

const floatingGradientStyle: React.CSSProperties = {
  position: 'absolute',
  width: '500px',
  height: '500px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
  top: '-15%',
  left: '5%',
  pointerEvents: 'none',
};

const floatingGradientStyle2: React.CSSProperties = {
  position: 'absolute',
  width: '500px',
  height: '500px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
  bottom: '-15%',
  right: '5%',
  pointerEvents: 'none',
};

const cardStyle: React.CSSProperties = {
  maxWidth: '720px',
  width: '100%',
  padding: '2.5rem',
  background: 'var(--bg-card)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const successCardStyle: React.CSSProperties = {
  maxWidth: '520px',
  width: '100%',
  padding: '3rem 2.5rem',
  background: 'var(--bg-card)',
  zIndex: 10,
};

const backLinkWrapper: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginBottom: '-0.5rem'
};

const backLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: '0.8rem',
  fontWeight: 500,
  transition: 'color var(--transition-fast)'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const logoWrapperStyle: React.CSSProperties = {
  background: 'rgba(139, 92, 246, 0.1)',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  marginBottom: '1rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.45rem',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  marginBottom: '0.25rem',
};

const subTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
};

const errorBannerStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#f87171',
  fontSize: '0.85rem',
  textAlign: 'center'
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.25rem',
};

const logoPreviewSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const logoPreviewBoxStyle: React.CSSProperties = {
  height: '112px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden'
};

const previewImageStyle: React.CSSProperties = {
  maxWidth: '90%',
  maxHeight: '90%',
  objectFit: 'contain',
  zIndex: 2,
};

const logoPlaceholderStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  zIndex: 1
};

const inputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '1rem',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const plansGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '0.75rem',
};

const planCardStyle = (selected: boolean, activeColor: string): React.CSSProperties => ({
  background: selected ? activeColor : 'rgba(255, 255, 255, 0.02)',
  border: '1px solid',
  borderColor: selected ? 'var(--primary)' : 'var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.85rem 1rem',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  transition: 'all var(--transition-fast)'
});

const priceBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--primary)',
  background: 'rgba(59, 130, 246, 0.12)',
  padding: '0.15rem 0.4rem',
  borderRadius: '4px'
};

const successIconWrapper: React.CSSProperties = {
  background: 'var(--success-bg)',
  padding: '1.25rem',
  borderRadius: '50%',
};
