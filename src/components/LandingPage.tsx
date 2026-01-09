import { Camera, TrendingUp, Sparkles, Target } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="landing-hero">
        <h1>CalorieTracker</h1>
        <p className="tagline">Your AI-powered nutrition companion</p>
      </header>

      {/* Features Section */}
      <section className="landing-features">
        <div className="feature">
          <div className="feature-icon">
            <Camera size={28} />
          </div>
          <div className="feature-text">
            <h3>Scan Your Food</h3>
            <p>Take a photo and AI identifies calories & macros instantly</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <TrendingUp size={28} />
          </div>
          <div className="feature-text">
            <h3>Track Progress</h3>
            <p>Monitor weight, body composition, and nutrition trends</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <Sparkles size={28} />
          </div>
          <div className="feature-text">
            <h3>AI Insights</h3>
            <p>Get personalized tips based on your eating patterns</p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-icon">
            <Target size={28} />
          </div>
          <div className="feature-text">
            <h3>Hit Your Goals</h3>
            <p>Set targets and track your journey to better health</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <button className="cta-button" onClick={onGetStarted}>
          Get Started Free
        </button>
        <p className="cta-subtext">No credit card required</p>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Track smarter. Eat better.</p>
      </footer>
    </div>
  );
}
