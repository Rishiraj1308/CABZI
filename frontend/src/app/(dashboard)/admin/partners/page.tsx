
'use server'

import PartnersClient from './partners-client'


export default async function AdminPartnersPage() {
  
  return (
      <div className="space-y-6">
          <PartnersClient />
      </div>
  );
}

