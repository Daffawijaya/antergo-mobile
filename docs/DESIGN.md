# anterGo Mobile Design System

## Design Direction
The design is mobile-first, simple, clean, and functional. It avoids excessive decoration, focusing on action and content.

## Source of Truth
The **Customer UI** within `src/app/(customer)/` serves as the primary source of truth for all design patterns.

## Brand
- **Logo**: Used in specific header contexts (not explicitly tokenized in `constants`).
- **Primary Color**: `#FFB900`
- **Text Color**: `#111827`

## Colors
Defined in `src/constants/colors.ts`:
- **Primary**: `#FFB900` (primaryPressed: `#E5A600`, primaryDark: `#92400E`, primarySoft: `#FFF4CC`)
- **Background**: `#F5F7F6`
- **Surface**: `#FFFFFF` (surfaceMuted: `#F9FAFB`)
- **Text**: `#111827` (muted: `#6B7280`, subtle: `#9CA3AF`)
- **Feedback**: Success (`#16A34A`), Warning (`#D97706`), Danger (`#DC2626`), Info (`#2563EB`)

## Typography
Defined in `src/constants/colors.ts` using the 'Outfit' font family:
- **Display**: 30px, 800
- **PageTitle**: 26px, 800
- **SectionTitle**: 19px, 800
- **CardTitle**: 16px, 700
- **Body**: 15px, 400
- **Metadata**: 13px, 500
- **Caption**: 12px, 600
- **Button**: 15px, 800

## Spacing
Defined in `src/constants/colors.ts` (`Spacing` object):
- **xs**: 4, **sm**: 8, **md**: 12, **lg**: 16, **xl**: 20, **xxl**: 24, **xxxl**: 32, **huge**: 40

## Layout
- **Container**: `SafeAreaView` with `flex-1`, `bg-background`.
- **Screen Padding**: Default horizontal padding of 20 (`px-5`) for padded screens.
- **Web**: Designed mobile-first. Centered layout recommended if wider screens are used.

## Border Radius
Defined in `src/constants/colors.ts` (`Radius` object):
- **sm**: 10, **md**: 14, **lg**: 18, **xl**: 24, **pill**: 999

## Borders & Shadows
- **Border**: `#E5E7EB` (borderStrong: `#D1D5DB`)
- **Shadows**: Defined in `Elevation` (`card`: 12 shadow radius, `floating`: 20 shadow radius).

## Buttons
Refer to `Button` component in `src/components/ui.tsx`:
- **Variants**: `primary`, `secondary`, `danger`.
- **Height**: 48px (`min-h-12`).
- **Radius**: 14 (`Radius.md`).

## Inputs & Forms
Refer to `FormField` component in `src/components/ui.tsx`:
- **Container**: Gap 8 (`gap-2`).
- **Label**: Bold 13px.
- **Input**: Height 48px, Radius 14, border `border-border`.

## Cards
Refer to `Card` component in `src/components/ui.tsx`:
- **Styles**: Border 1px `border-border`, Radius 18 (`Radius.lg`), padding 16 (`p-4`).

## Navigation
- **Bottom Tabs**: Used in `(tabs)`.
- **Header**: Used `PageHeader` or `SectionHeader` from `src/components/ui.tsx`.

## Icons
- **Library**: `brand-icons.tsx` and `app-icon.tsx`.
- **Style**: Solid/Fill based.

## Images
- **Border Radius**: Consistent with card or container radius.
- **Resizing**: `resizeMode="cover"` or `"contain"`.

## Loading / Empty / Error States
Refer to `StatusState` component in `src/components/ui.tsx`.

## Responsive Rules
- **Mobile-first**: Default approach.
- **Web**: Keep mobile layout, centered on desktop if needed (respect `MaxContentWidth` from `src/constants/theme.ts`).

## Customer UI Reference Screens
- **Home**: `src/app/(customer)/(tabs)/index.tsx` (Spacing, Service buttons).
- **Profile**: `src/components/profile-screen.tsx`.

## Do
- Reuse existing `ui.tsx` components.
- Use `Colors`, `Spacing`, `Radius`, `Typography` tokens.
- Keep screens mobile-first.
- Maintain consistent radii.

## Don't
- Introduce new colors.
- Use random gradients.
- Install new UI/animation libraries without necessity.
- Invent new spacing values if tokens exist.

## Implementation Rules
1. Read `docs/DESIGN.md` first.
2. Use Customer UI as primary visual reference.
3. Reuse existing components in `src/components/ui.tsx` before creating new ones.
4. Preserve existing business logic.
5. Avoid unrelated redesign.
6. Keep Web compatible with React Native Web.
