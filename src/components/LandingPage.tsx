import { Camera, TrendingUp, Sparkles, Target, ChevronRight, Apple, Salad, Dumbbell, Heart } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      {/* Floating Background Elements */}
      <div className="landing-bg-elements">
        <div className="floating-icon floating-1"><Apple size={24} /></div>
        <div className="floating-icon floating-2"><Salad size={28} /></div>
        <div className="floating-icon floating-3"><Dumbbell size={22} /></div>
        <div className="floating-icon floating-4"><Heart size={20} /></div>
        <div className="floating-icon floating-5"><Apple size={18} /></div>
        <div className="floating-icon floating-6"><Salad size={20} /></div>
      </div>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="hero-badge">AI-Powered</div>
        <h1>CalorieTracker</h1>
        <p className="tagline">Your personal nutrition companion that makes healthy eating effortless</p>

        {/* Phone Mockup */}
        <div className="phone-mockup">
          <div className="phone-screen">
            <div className="mock-header">
              <span>Today's Progress</span>
            </div>
            <div className="mock-calories">
              <div className="mock-circle">
                <span className="mock-number">1,847</span>
                <span className="mock-label">kcal</span>
              </div>
            </div>
            <div className="mock-macros">
              <div className="mock-macro">
                <div className="mock-bar protein"></div>
                <span>Protein</span>
              </div>
              <div className="mock-macro">
                <div className="mock-bar carbs"></div>
                <span>Carbs</span>
              </div>
              <div className="mock-macro">
                <div className="mock-bar fat"></div>
                <span>Fat</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="landing-features">
        <div className="feature">
          <div className="feature-icon">
            <Camera size={24} />
          </div>
          <div className="feature-text">
            <h3>Snap & Track</h3>
            <p>AI identifies your food instantly from photos</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <TrendingUp size={24} />
          </div>
          <div className="feature-text">
            <h3>See Progress</h3>
            <p>Beautiful charts track your journey</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <Sparkles size={24} />
          </div>
          <div className="feature-text">
            <h3>Smart Tips</h3>
            <p>Personalized AI coaching daily</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <Target size={24} />
          </div>
          <div className="feature-text">
            <h3>Reach Goals</h3>
            <p>Custom targets that adapt to you</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="landing-stats">
        <div className="stat">
          <span className="stat-number">10K+</span>
          <span className="stat-label">Foods in database</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat">
          <span className="stat-number">99%</span>
          <span className="stat-label">AI accuracy</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat">
          <span className="stat-number">Free</span>
          <span className="stat-label">Forever</span>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <button className="cta-button" onClick={onGetStarted}>
          Get Started
          <ChevronRight size={20} />
        </button>
        <p className="cta-subtext">Free forever. No credit card needed.</p>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Track smarter. Eat better. Live healthier.</p>
      </footer>
    </div>
  );
}
