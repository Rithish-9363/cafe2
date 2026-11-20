import { useApp } from '../context/AppContext';
import { EditorialImage } from '../components/EditorialImage';

export function StoryPage() {
  const { navigate } = useApp();

  return (
    <div>
      {/* Story Intro */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-3">
            Our Story
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#302820] leading-[1.1] tracking-tight">
            A modern European salon built around slow mornings.
          </h1>
          <p className="mt-6 text-lg text-[#302820]/80 leading-relaxed">
            Brew &amp; Bliss began with a simple conviction: the first cup of the day deserves quiet light, honest ingredients, and patient craft—never haste.
          </p>
        </div>

        <div className="mt-10 aspect-[16/9] max-h-[540px] bg-[#EEE8DE] overflow-hidden">
          <EditorialImage
            src="/src/assets/images/hero_cafe_morning_1795207091329.jpg"
            alt="Brew & Bliss sunlit café room"
            className="w-full h-full object-cover"
            eager
          />
        </div>
      </section>

      {/* Philosophy & Coffee-Making Approach */}
      <section className="bg-white border-y border-[#302820]/10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
                Craft &amp; Method
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#302820] leading-tight">
                How we roast, steep, and bake each morning.
              </h2>
              <p className="mt-4 text-sm text-[#302820]/75 leading-relaxed">
                Every stage of our kitchen and espresso bar follows European café discipline: small volumes, seasonal harvests, and zero shortcuts.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#302820]/10">
              <div className="pb-6">
                <h3 className="font-serif text-xl text-[#302820]">01. Direct-Origin Micro-Lots</h3>
                <p className="mt-2 text-sm text-[#302820]/75 leading-relaxed">
                  We partner directly with family-owned washing stations in Ethiopia, Kenya, and Colombia, roasting light-to-medium every Tuesday so florals and natural sweetness stay intact.
                </p>
              </div>
              <div className="py-6">
                <h3 className="font-serif text-xl text-[#302820]">02. Precision Extraction &amp; Water Balance</h3>
                <p className="mt-2 text-sm text-[#302820]/75 leading-relaxed">
                  Our espresso bar pulls double ristrettos at nine bars using remineralized soft water, while our V60 pour-overs are bloomed by hand for three-minute clarity.
                </p>
              </div>
              <div className="pt-6">
                <h3 className="font-serif text-xl text-[#302820]">03. Seventy-Two Hour Viennoiserie</h3>
                <p className="mt-2 text-sm text-[#302820]/75 leading-relaxed">
                  Our bakers ferment brioche and croissant doughs for three days, folding cultured Normandy butter into crisp honeycomb layers pulled fresh from stone deck ovens at 6:30 a.m.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Image Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
              Visual Journal
            </p>
            <h2 className="font-serif text-3xl text-[#302820]">Scenes from the roastery &amp; counter</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
          >
            Explore the Menu
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <figure className="bg-white border border-[#302820]/10">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/story_roastery_pour_1795207091832.jpg"
                alt="Pour-over ritual at the Brew & Bliss counter"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-5 text-sm text-[#302820]/75">
              Slow hand-poured Kenyan AA filter coffee prepared to order.
            </figcaption>
          </figure>
          <figure className="bg-white border border-[#302820]/10">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/gallery_cafe_seating_1795207095816.jpg"
                alt="Sunlit reading table inside Brew & Bliss"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-5 text-sm text-[#302820]/75">
              Window-side marble tables designed for reading, journaling, and unhurried conversation.
            </figcaption>
          </figure>
          <figure className="bg-white border border-[#302820]/10">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/product_matcha_tea_1795207094443.jpg"
                alt="Ceremonial Uji matcha and botanical tea service"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-5 text-sm text-[#302820]/75">
              First-harvest Kyoto matcha whisked in speckled stoneware beside whole-blossom tisanes.
            </figcaption>
          </figure>
          <figure className="bg-white border border-[#302820]/10">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/gallery_bakery_table_1795207093049.jpg"
                alt="Almond croissants and flat white table service"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-5 text-sm text-[#302820]/75">
              Dawn pastries served warm on stoneware with linen napkins.
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
