import type {Metadata,Viewport} from 'next';import './globals.css';
export const metadata:Metadata={title:'Tempo · Business manager',description:'Pilote ton activité de business manager en un coup d’œil.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icons/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#183025'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
