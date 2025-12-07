async function cancelOrder(id) {
    if (!confirm(`Are you sure you want to cancel Order #${id}?`)) return;

    try {
        const res = await fetch(`${api}/orders/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (res.ok || res.status === 204) {
            notify(`Order #${id} cancelled`, 'success');
            await fetchData();
        } else {
            notify('Failed to cancel order', 'error');
        }
    } catch (e) { notify('Error cancelling order', 'error'); }
}
