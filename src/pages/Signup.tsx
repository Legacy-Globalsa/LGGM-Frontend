import { SignupForm } from '@/components/signup-form';
import LGGMImage from '@/assets/LGGM-Image.png';
import LGGMImage2 from '@/assets/LGGM-Image2.png';

export default function Signup() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
         <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center text-primary-foreground">
              <img
                src={LGGMImage2}
                alt="Lamb of God Global Ministries"
              />
            </div>
            LGGM International
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src={LGGMImage}
          alt="Lamb of God Global Ministries"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
