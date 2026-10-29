document.addEventListener('DOMContentLoaded', () => {
  const status = document.querySelector('#parking-status');
  const list = document.querySelector('#parking-list');
  const retry = document.querySelector('#parking-retry');
  const tab = document.querySelector('[data-modal-target="modal-parking"]');
  if (!status || !list || !retry || !tab) return;
  let resource = null;
  let controller = null;
  let loaded = false;

  const load = async () => {
    if (!resource || loaded) return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 60000);
    retry.disabled = true;
    list.setAttribute('aria-busy', 'true');
    list.replaceChildren();
    status.textContent = '근처 주차장을 찾고 있습니다…';
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('local');
      const response = await fetch(`/api/parking?resource=${encodeURIComponent(resource)}`, {
        signal: request.signal, cache: 'no-store'
      });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!Array.isArray(data.parking)) throw new Error('format');
      if (controller !== request) return;
      for (const parking of data.parking) {
        const card = document.createElement('article');
        card.className = 'parking-card';
        const heading = document.createElement('h4');
        heading.textContent = parking.name;
        const address = document.createElement('p');
        address.textContent = parking.address;
        const info = document.createElement('p');
        const distance = parking.distance >= 1000 ? `${(parking.distance / 1000).toFixed(1)}km` : `${parking.distance}m`;
        info.textContent = `직선거리 ${distance} · ${parking.fee} · ${parking.capacity == null ? '주차면 정보 없음' : `총 ${parking.capacity}면`}`;
        card.append(heading, address, info);
        if (Number.isFinite(parking.lat) && Number.isFinite(parking.lon)) {
          const link = document.createElement('a');
          link.href = `https://map.kakao.com/link/map/${encodeURIComponent(parking.name)},${parking.lat},${parking.lon}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = '지도에서 보기 ↗';
          card.append(link);
        }
        list.append(card);
      }
      loaded = true;
      status.textContent = data.parking.length ? `가까운 주차장 ${data.parking.length}곳입니다.` : '해당 구의 반경 3km 내에 제공된 주차장 정보가 없습니다.';
      retry.hidden = true;
    } catch (_error) {
      if (controller !== request) return;
      status.textContent = '주차장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      retry.textContent = '다시 불러오기';
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (controller === request) {
        retry.disabled = false;
        list.setAttribute('aria-busy', 'false');
      }
    }
  };
  document.addEventListener('ove-resource-open', event => {
    controller?.abort();
    controller = null;
    list.setAttribute('aria-busy', 'false');
    resource = event.detail.resource;
    loaded = false;
    list.replaceChildren();
    status.textContent = '근처 주차장을 확인해 보세요.';
    retry.textContent = '주차장 불러오기';
    retry.hidden = false;
    retry.disabled = false;
  });
  tab.addEventListener('click', load);
  retry.addEventListener('click', load);
  document.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', () => {
    controller?.abort();
    controller = null;
    retry.disabled = false;
  }));
});
